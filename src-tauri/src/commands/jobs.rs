use crate::commands::utils::expand_tilde;
use crate::models::job::{Job, JobStatus, LogLine, LogStream, SshAuth, SshParams};
use chrono::Utc;
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::sync::Mutex;
use uuid::Uuid;

pub type JobStore = Arc<Mutex<HashMap<String, Job>>>;
pub type PidStore = Arc<Mutex<HashMap<String, u32>>>;


#[tauri::command]
pub async fn launch_local_job(
    app: AppHandle,
    job_store: tauri::State<'_, JobStore>,
    pid_store: tauri::State<'_, PidStore>,
    config_path: String,
    working_dir: String,
    python_cmd: Option<String>,
    experiment_name: Option<String>,
) -> Result<String, String> {
    let job_id = Uuid::new_v4().to_string();
    let python = python_cmd.unwrap_or_else(|| "python3".into());
    let name = experiment_name.unwrap_or_else(|| format!("job-{}", &job_id[..8]));

    let working_dir = expand_tilde(&working_dir);
    let config_path = expand_tilde(&config_path);

    let config_abs = if std::path::Path::new(&config_path).is_absolute() {
        config_path.clone()
    } else {
        format!("{}/{}", working_dir, config_path)
    };

    let job = Job {
        id: job_id.clone(),
        name: name.clone(),
        status: JobStatus::Pending,
        created_at: Utc::now(),
        started_at: None,
        finished_at: None,
        working_dir: working_dir.clone(),
        config_path: config_abs.clone(),
        is_remote: false,
        remote_host: None,
        pid: None,
    };

    {
        let mut store = job_store.lock().await;
        store.insert(job_id.clone(), job);
    }

    let job_id_clone = job_id.clone();
    let app_clone = app.clone();
    let job_store_clone = job_store.inner().clone();
    let pid_store_clone = pid_store.inner().clone();

    tokio::spawn(async move {
        // Hydra expects --config-path=<dir> and --config-name=<stem> (no extension)
        let config_stem = std::path::Path::new(&config_abs)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("config")
            .to_string();
        let config_dir = std::path::Path::new(&config_abs)
            .parent()
            .map(|p| p.to_string_lossy().into_owned())
            .unwrap_or_else(|| working_dir.clone());

        let mut cmd = tokio::process::Command::new(&python);
        cmd.args(["-m", "verl.trainer.main_ppo"])
            .arg(format!("--config-path={}", config_dir))
            .arg(format!("--config-name={}", config_stem))
            .current_dir(&working_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .kill_on_drop(true);

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let mut store = job_store_clone.lock().await;
                if let Some(job) = store.get_mut(&job_id_clone) {
                    job.status = JobStatus::Failed;
                    job.finished_at = Some(Utc::now());
                }
                let _ = app_clone.emit(
                    "job:status",
                    serde_json::json!({
                        "job_id": job_id_clone,
                        "status": "failed",
                        "error": e.to_string()
                    }),
                );
                return;
            }
        };

        let pid = child.id();
        {
            let mut store = job_store_clone.lock().await;
            if let Some(job) = store.get_mut(&job_id_clone) {
                job.status = JobStatus::Running;
                job.started_at = Some(Utc::now());
                job.pid = pid;
            }
            if let Some(p) = pid {
                let mut pids = pid_store_clone.lock().await;
                pids.insert(job_id_clone.clone(), p);
            }
        }
        let _ = app_clone.emit(
            "job:status",
            serde_json::json!({"job_id": job_id_clone, "status": "running"}),
        );

        let stdout = child.stdout.take().map(BufReader::new);
        let stderr = child.stderr.take().map(BufReader::new);

        let app_out = app_clone.clone();
        let jid_out = job_id_clone.clone();
        if let Some(mut reader) = stdout {
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) | Err(_) => break,
                    Ok(_) => {
                        let log = LogLine {
                            job_id: jid_out.clone(),
                            line: line.trim_end().to_string(),
                            timestamp: Utc::now(),
                            stream: LogStream::Stdout,
                        };
                        let _ = app_out.emit("job:log", &log);
                    }
                }
            }
        }

        let app_err = app_clone.clone();
        let jid_err = job_id_clone.clone();
        if let Some(mut reader) = stderr {
            let mut line = String::new();
            loop {
                line.clear();
                match reader.read_line(&mut line).await {
                    Ok(0) | Err(_) => break,
                    Ok(_) => {
                        let log = LogLine {
                            job_id: jid_err.clone(),
                            line: line.trim_end().to_string(),
                            timestamp: Utc::now(),
                            stream: LogStream::Stderr,
                        };
                        let _ = app_err.emit("job:log", &log);
                    }
                }
            }
        }

        let exit_status = child.wait().await;
        let success = exit_status.map(|s| s.success()).unwrap_or(false);

        let mut store = job_store_clone.lock().await;
        if let Some(job) = store.get_mut(&job_id_clone) {
            job.status = if success { JobStatus::Done } else { JobStatus::Failed };
            job.finished_at = Some(Utc::now());
        }
        let _ = app_clone.emit(
            "job:status",
            serde_json::json!({
                "job_id": job_id_clone,
                "status": if success { "done" } else { "failed" }
            }),
        );
    });

    Ok(job_id)
}

#[tauri::command]
pub async fn stop_job(
    job_store: tauri::State<'_, JobStore>,
    pid_store: tauri::State<'_, PidStore>,
    job_id: String,
) -> Result<(), String> {
    let pid = {
        let pids = pid_store.lock().await;
        pids.get(&job_id).copied()
    };

    if let Some(pid) = pid {
        #[cfg(unix)]
        {
            use std::process::Command;
            Command::new("kill")
                .args(["-TERM", &pid.to_string()])
                .output()
                .map_err(|e| format!("Failed to kill process: {e}"))?;
        }
    }

    let mut store = job_store.lock().await;
    if let Some(job) = store.get_mut(&job_id) {
        job.status = JobStatus::Stopped;
        job.finished_at = Some(Utc::now());
    }

    Ok(())
}

#[tauri::command]
pub async fn get_job_status(
    job_store: tauri::State<'_, JobStore>,
    job_id: String,
) -> Result<Option<Job>, String> {
    let store = job_store.lock().await;
    Ok(store.get(&job_id).cloned())
}

#[tauri::command]
pub async fn list_jobs(job_store: tauri::State<'_, JobStore>) -> Result<Vec<Job>, String> {
    let store = job_store.lock().await;
    let mut jobs: Vec<Job> = store.values().cloned().collect();
    jobs.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(jobs)
}

#[tauri::command]
pub async fn launch_remote_job(
    app: AppHandle,
    job_store: tauri::State<'_, JobStore>,
    host: String,
    port: u16,
    username: String,
    auth: SshAuth,
    remote_work_dir: String,
    python_cmd: String,
    config_yaml: String,
    config_name: String,
    experiment_name: Option<String>,
) -> Result<String, String> {
    let job_id = Uuid::new_v4().to_string();
    let name = experiment_name.unwrap_or_else(|| format!("job-{}", &job_id[..8]));
    let host_clone = host.clone();

    let job = Job {
        id: job_id.clone(),
        name: name.clone(),
        status: JobStatus::Pending,
        created_at: Utc::now(),
        started_at: None,
        finished_at: None,
        working_dir: remote_work_dir.clone(),
        config_path: format!("{}/{}", remote_work_dir, config_name),
        is_remote: true,
        remote_host: Some(host_clone),
        pid: None,
    };

    {
        let mut store = job_store.lock().await;
        store.insert(job_id.clone(), job);
    }

    let job_id_clone = job_id.clone();
    let app_clone = app.clone();
    let job_store_clone = job_store.inner().clone();

    tokio::task::spawn_blocking(move || {
        let params = SshParams {
            host: host.clone(),
            port,
            username: username.clone(),
            auth,
            remote_work_dir: remote_work_dir.clone(),
            python_cmd: python_cmd.clone(),
        };

        let sess = match crate::commands::ssh::connect_session(&params) {
            Ok(s) => s,
            Err(e) => {
                let mut store = tokio::runtime::Handle::current()
                    .block_on(job_store_clone.lock());
                if let Some(job) = store.get_mut(&job_id_clone) {
                    job.status = JobStatus::Failed;
                    job.finished_at = Some(Utc::now());
                }
                let _ = app_clone.emit(
                    "job:status",
                    serde_json::json!({"job_id": job_id_clone, "status": "failed", "error": e}),
                );
                return;
            }
        };

        // Create remote work dir
        if let Ok(mut ch) = sess.channel_session() {
            let _ = ch.exec(&format!("mkdir -p {}", remote_work_dir));
            let _ = ch.wait_close();
        }

        // Upload config file
        let config_bytes = config_yaml.as_bytes();
        let remote_config = format!("{}/{}", remote_work_dir, config_name);
        let upload_ok = sess
            .scp_send(
                std::path::Path::new(&remote_config),
                0o644,
                config_bytes.len() as u64,
                None,
            )
            .map_err(|e| e.to_string())
            .and_then(|mut f| {
                use std::io::Write;
                f.write_all(config_bytes).map_err(|e| e.to_string())
            });

        if let Err(e) = upload_ok {
            let _ = app_clone.emit(
                "job:log",
                LogLine {
                    job_id: job_id_clone.clone(),
                    line: format!("[SSH] Config upload failed: {e}"),
                    timestamp: Utc::now(),
                    stream: LogStream::Stderr,
                },
            );
        }

        // Execute training command
        let cmd = format!(
            "{} -m verl.trainer.main_ppo --config-path={} --config-name={}",
            python_cmd, remote_work_dir, config_name
        );

        let mut channel = match sess.channel_session() {
            Ok(ch) => ch,
            Err(e) => {
                let _ = app_clone.emit(
                    "job:status",
                    serde_json::json!({"job_id": job_id_clone, "status": "failed", "error": e.to_string()}),
                );
                return;
            }
        };

        if let Err(e) = channel.exec(&cmd) {
            let _ = app_clone.emit(
                "job:status",
                serde_json::json!({"job_id": job_id_clone, "status": "failed", "error": e.to_string()}),
            );
            return;
        }

        {
            let mut store = tokio::runtime::Handle::current()
                .block_on(job_store_clone.lock());
            if let Some(job) = store.get_mut(&job_id_clone) {
                job.status = JobStatus::Running;
                job.started_at = Some(Utc::now());
            }
        }
        let _ = app_clone.emit(
            "job:status",
            serde_json::json!({"job_id": job_id_clone, "status": "running"}),
        );

        use std::io::BufRead;
        let reader = std::io::BufReader::new(&mut channel);
        for line in reader.lines().flatten() {
            let _ = app_clone.emit(
                "job:log",
                LogLine {
                    job_id: job_id_clone.clone(),
                    line,
                    timestamp: Utc::now(),
                    stream: LogStream::Stdout,
                },
            );
        }

        let _ = channel.wait_close();
        let success = channel.exit_status().unwrap_or(-1) == 0;

        {
            let mut store = tokio::runtime::Handle::current()
                .block_on(job_store_clone.lock());
            if let Some(job) = store.get_mut(&job_id_clone) {
                job.status = if success { JobStatus::Done } else { JobStatus::Failed };
                job.finished_at = Some(Utc::now());
            }
        }
        let _ = app_clone.emit(
            "job:status",
            serde_json::json!({
                "job_id": job_id_clone,
                "status": if success { "done" } else { "failed" }
            }),
        );
    });

    Ok(job_id)
}
