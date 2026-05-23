mod commands;
mod models;

use commands::jobs::{JobStore, PidStore};
use commands::mcp::SharedFlowConfig;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let job_store: JobStore = Arc::new(Mutex::new(HashMap::new()));
    let pid_store: PidStore = Arc::new(Mutex::new(HashMap::new()));
    let flow_config: SharedFlowConfig = Arc::new(Mutex::new(None));

    let flow_config_clone = flow_config.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .manage(job_store)
        .manage(pid_store)
        .manage(flow_config)
        .invoke_handler(tauri::generate_handler![
            // Config
            commands::config::parse_yaml,
            commands::config::parse_yaml_string,
            commands::config::serialize_yaml,
            commands::config::save_yaml,
            commands::config::validate_config,
            commands::config::list_templates,
            // Jobs
            commands::jobs::launch_local_job,
            commands::jobs::launch_remote_job,
            commands::jobs::stop_job,
            commands::jobs::get_job_status,
            commands::jobs::list_jobs,
            // SSH
            commands::ssh::test_ssh,
            commands::ssh::upload_file,
            commands::ssh::exec_remote,
            commands::ssh::list_remote_files,
            commands::ssh::detect_local_gpus,
            commands::ssh::detect_remote_gpus,
            // MCP
            commands::mcp::sync_flow_config,
            commands::mcp::get_mcp_port,
            // Metrics
            commands::metrics::fetch_wandb_runs,
            commands::metrics::poll_wandb_metrics,
            commands::metrics::parse_tensorboard_events,
        ])
        .setup(|app| {
            let app_handle = app.handle().clone();
            tokio::spawn(async move {
                commands::mcp::start_mcp_server(flow_config_clone, app_handle).await;
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
