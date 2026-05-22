use crate::models::job::{Job, JobStatus, LogLine, LogStream};
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

fn make_launch_args(config_path: &str, working_dir: &str) -> Vec<String> {
    vec![
        "-m".into(),
        "verl.trainer.main_ppo".into(),
        format!("--config-path={}", working_dir),
        format!("--config-name={}", config_path),
    ]
}

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
        let mut cmd = tokio::process::Command::new(&python);
        cmd.args(["-m", "verl.trainer.main_ppo"])
            .arg(format!("--config-path={}", working_dir))
            .arg(format!("--config-name={}", config_abs))
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
