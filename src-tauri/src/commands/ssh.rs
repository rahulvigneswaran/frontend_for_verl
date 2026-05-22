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

pub fn connect_session(params: &SshParams) -> Result<ssh2::Session, String> {
    let addr = format!("{}:{}", params.host, params.port);
    let tcp = TcpStream::connect(&addr)
        .map_err(|e| format!("TCP connect to {} failed: {}", addr, e))?;

    let mut sess = ssh2::Session::new().map_err(|e| format!("SSH session error: {e}"))?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| format!("SSH handshake failed: {e}"))?;

    match &params.auth {
        crate::models::job::SshAuth::Password { password } => {
            sess.userauth_password(&params.username, password)
                .map_err(|e| format!("Password auth failed: {e}"))?;
        }
        crate::models::job::SshAuth::Key { key_path, passphrase } => {
            let key = std::path::Path::new(key_path);
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
                return Err("SSH agent authentication failed".into());
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
                    message: "Connection successful".into(),
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
        let mut channel = sess.channel_session()
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
