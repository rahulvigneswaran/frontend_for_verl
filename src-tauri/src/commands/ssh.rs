use crate::models::job::SshParams;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::net::TcpStream;

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionResult {
    pub success: bool,
    pub message: String,
    pub server_banner: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RemoteFile {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub vram_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub gpus: Vec<GpuInfo>,
    pub gpu_count: usize,
    pub total_vram_mb: u64,
    pub error: Option<String>,
}

fn parse_gpu_info(output: &str) -> HardwareInfo {
    let mut gpus = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let mut parts = line.splitn(2, ',');
        let name = parts.next().unwrap_or("").trim().to_string();
        let vram_mb: u64 = parts.next().unwrap_or("0").trim().parse().unwrap_or(0);
        if !name.is_empty() && !name.contains("NVIDIA-SMI") && !name.contains("failed") {
            gpus.push(GpuInfo { name, vram_mb });
        }
    }
    let total = gpus.iter().map(|g| g.vram_mb).sum();
    let count = gpus.len();
    HardwareInfo {
        gpus,
        gpu_count: count,
        total_vram_mb: total,
        error: None,
    }
}

pub fn connect_session(params: &SshParams) -> Result<ssh2::Session, String> {
    let addr = format!("{}:{}", params.host, params.port);
    let tcp = TcpStream::connect(&addr)
        .map_err(|e| format!("TCP connect to {} failed: {}", addr, e))?;

    let mut sess = ssh2::Session::new().map_err(|e| format!("SSH session error: {e}"))?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| format!("SSH handshake failed: {e}"))?;

    match &params.auth {
        crate::models::job::SshAuth::Password { password } => {
            if password.is_empty() {
                return Err("Password auth requires a non-empty password. Set it in Settings → SSH.".into());
            }
            sess.userauth_password(&params.username, password)
                .map_err(|e| format!("Password auth failed: {e}"))?;
        }
        crate::models::job::SshAuth::Key { key_path, passphrase } => {
            if key_path.is_empty() {
                return Err("Key auth requires a key file path. Set it in Settings → SSH.".into());
            }
            let key = std::path::Path::new(key_path);
            if !key.exists() {
                return Err(format!("Key file not found: {}", key_path));
            }
            sess.userauth_pubkey_file(
                &params.username,
                None,
                key,
                passphrase.as_deref(),
            )
            .map_err(|e| format!("Key auth failed: {e}"))?;
        }
        crate::models::job::SshAuth::Agent => {
            let mut agent = sess.agent().map_err(|e| format!("SSH agent error: {e}"))?;
            agent.connect().map_err(|e| format!("Agent connect failed: {e}"))?;
            agent.list_identities().map_err(|e| format!("Agent list failed: {e}"))?;
            for identity in agent.identities().map_err(|e| format!("{e}"))? {
                if agent.userauth(&params.username, &identity).is_ok() {
                    break;
                }
            }
            if !sess.authenticated() {
                return Err("SSH agent authentication failed — ensure ssh-agent is running with your key loaded (ssh-add ~/.ssh/id_rsa)".into());
            }
        }
    }

    Ok(sess)
}

#[tauri::command]
pub async fn test_ssh(connection: SshParams) -> Result<ConnectionResult, String> {
    tokio::task::spawn_blocking(move || {
        match connect_session(&connection) {
            Ok(sess) => {
                let banner = sess.banner().map(|s| s.to_string());
                Ok(ConnectionResult {
                    success: true,
                    message: format!("Connected to {}@{}", connection.username, connection.host),
                    server_banner: banner,
                })
            }
            Err(e) => Ok(ConnectionResult {
                success: false,
                message: e,
                server_banner: None,
            }),
        }
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn detect_local_gpus() -> Result<HardwareInfo, String> {
    tokio::task::spawn_blocking(move || {
        let output = std::process::Command::new("nvidia-smi")
            .args(["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])
            .output();

        match output {
            Ok(o) if o.status.success() => {
                let stdout = String::from_utf8_lossy(&o.stdout).to_string();
                Ok(parse_gpu_info(&stdout))
            }
            Ok(o) => {
                let stderr = String::from_utf8_lossy(&o.stderr).trim().to_string();
                Ok(HardwareInfo {
                    gpus: vec![],
                    gpu_count: 0,
                    total_vram_mb: 0,
                    error: Some(if stderr.is_empty() {
                        "nvidia-smi returned an error (no NVIDIA GPU found?)".into()
                    } else {
                        stderr
                    }),
                })
            }
            Err(e) => Ok(HardwareInfo {
                gpus: vec![],
                gpu_count: 0,
                total_vram_mb: 0,
                error: Some(format!("nvidia-smi not found — install NVIDIA drivers: {e}")),
            }),
        }
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn detect_remote_gpus(connection: SshParams) -> Result<HardwareInfo, String> {
    tokio::task::spawn_blocking(move || {
        let sess = connect_session(&connection)?;
        let mut channel = sess
            .channel_session()
            .map_err(|e| format!("Channel open failed: {e}"))?;

        channel
            .exec("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits 2>&1")
            .map_err(|e| format!("Exec failed: {e}"))?;

        let mut stdout = String::new();
        channel.read_to_string(&mut stdout).ok();
        channel.wait_close().ok();
        let exit_code = channel.exit_status().unwrap_or(-1);

        if exit_code != 0 {
            return Ok(HardwareInfo {
                gpus: vec![],
                gpu_count: 0,
                total_vram_mb: 0,
                error: Some(stdout.trim().to_string()),
            });
        }

        Ok(parse_gpu_info(&stdout))
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn upload_file(
    connection: SshParams,
    local_path: String,
    remote_path: String,
) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let sess = connect_session(&connection)?;
        let content = std::fs::read(&local_path)
            .map_err(|e| format!("Failed to read local file: {e}"))?;

        let mut remote_file = sess
            .scp_send(
                std::path::Path::new(&remote_path),
                0o644,
                content.len() as u64,
                None,
            )
            .map_err(|e| format!("SCP send failed: {e}"))?;

        use std::io::Write;
        remote_file
            .write_all(&content)
            .map_err(|e| format!("SCP write failed: {e}"))?;

        Ok(())
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn exec_remote(
    connection: SshParams,
    command: String,
) -> Result<(String, String, i32), String> {
    tokio::task::spawn_blocking(move || {
        let sess = connect_session(&connection)?;
        let mut channel = sess
            .channel_session()
            .map_err(|e| format!("Channel open failed: {e}"))?;

        channel.exec(&command).map_err(|e| format!("Exec failed: {e}"))?;

        let mut stdout = String::new();
        channel.read_to_string(&mut stdout).ok();

        let mut stderr = String::new();
        channel.stderr().read_to_string(&mut stderr).ok();

        channel.wait_close().ok();
        let exit_code = channel.exit_status().unwrap_or(-1);

        Ok((stdout, stderr, exit_code))
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}

#[tauri::command]
pub async fn list_remote_files(
    connection: SshParams,
    remote_path: String,
) -> Result<Vec<RemoteFile>, String> {
    tokio::task::spawn_blocking(move || {
        let sess = connect_session(&connection)?;
        let sftp = sess.sftp().map_err(|e| format!("SFTP failed: {e}"))?;
        let entries = sftp
            .readdir(std::path::Path::new(&remote_path))
            .map_err(|e| format!("readdir failed: {e}"))?;

        let files = entries
            .into_iter()
            .map(|(path, stat)| RemoteFile {
                name: path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .into_owned(),
                path: path.to_string_lossy().into_owned(),
                is_dir: stat.is_dir(),
                size: stat.size.unwrap_or(0),
            })
            .collect();

        Ok(files)
    })
    .await
    .map_err(|e| format!("Task error: {e}"))?
}
