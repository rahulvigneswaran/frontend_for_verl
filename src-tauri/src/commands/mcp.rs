/// MCP (Model Context Protocol) server for VeRL Studio.
///
/// Runs an HTTP server on port 5174. Claude desktop (or any MCP client) can
/// connect to it by adding the following to claude_desktop_config.json:
///
///   "verl-studio": { "url": "http://localhost:5174/mcp" }
///
/// The server exposes tools that let AI agents read and modify the active
/// training pipeline without touching the Tauri UI directly.

use axum::{
    extract::State,
    http::Method,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::Mutex;
use tower_http::cors::{Any, CorsLayer};

pub type SharedFlowConfig = Arc<Mutex<Option<String>>>;

// ── State sync command (frontend → Rust) ─────────────────────────────────────

#[tauri::command]
pub async fn sync_flow_config(
    config_yaml: String,
    flow_config: tauri::State<'_, SharedFlowConfig>,
) -> Result<(), String> {
    let mut guard = flow_config.lock().await;
    *guard = Some(config_yaml);
    Ok(())
}

#[tauri::command]
pub async fn get_mcp_port() -> u16 {
    5174
}

// ── MCP protocol types ────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct McpRequest {
    #[allow(dead_code)]
    jsonrpc: Option<String>,
    id: Option<Value>,
    method: String,
    params: Option<Value>,
}

#[derive(Serialize)]
struct McpResponse {
    jsonrpc: String,
    id: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    result: Option<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<McpError>,
}

#[derive(Serialize)]
struct McpError {
    code: i32,
    message: String,
}

impl McpResponse {
    fn ok(id: Value, result: Value) -> Self {
        McpResponse {
            jsonrpc: "2.0".into(),
            id,
            result: Some(result),
            error: None,
        }
    }
    fn err(id: Value, code: i32, message: impl Into<String>) -> Self {
        McpResponse {
            jsonrpc: "2.0".into(),
            id,
            result: None,
            error: Some(McpError {
                code,
                message: message.into(),
            }),
        }
    }
}

// ── Server state ──────────────────────────────────────────────────────────────

#[derive(Clone)]
pub struct McpServerState {
    pub flow_config: SharedFlowConfig,
    pub app: AppHandle,
}

// ── Tool definitions ──────────────────────────────────────────────────────────

fn tool_list() -> Value {
    json!({
        "tools": [
            {
                "name": "get_config",
                "description": "Returns the current VeRL training pipeline configuration as a YAML string. Use this to inspect the current settings before making changes.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "set_config",
                "description": "Imports a VeRL training pipeline configuration from a YAML string, replacing the current flow in the UI.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "yaml": {
                            "type": "string",
                            "description": "Valid VeRL Hydra YAML configuration string"
                        }
                    },
                    "required": ["yaml"]
                }
            },
            {
                "name": "get_status",
                "description": "Returns VeRL Studio status: whether a config is loaded, app version, and MCP server port.",
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "suggest_config",
                "description": "Suggests a VeRL configuration YAML given a model name and algorithm. Returns a ready-to-use YAML string.",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "model": {
                            "type": "string",
                            "description": "HuggingFace model ID, e.g. 'Qwen/Qwen2.5-7B-Instruct'"
                        },
                        "algorithm": {
                            "type": "string",
                            "enum": ["ppo", "grpo", "dapo", "rloo", "reinforce_pp"],
                            "description": "RL algorithm to use"
                        },
                        "n_gpus": {
                            "type": "integer",
                            "description": "Total number of GPUs available"
                        }
                    },
                    "required": ["model", "algorithm"]
                }
            }
        ]
    })
}

// ── Request handler ───────────────────────────────────────────────────────────

async fn handle_mcp(
    State(state): State<McpServerState>,
    Json(req): Json<McpRequest>,
) -> Json<McpResponse> {
    let id = req.id.clone().unwrap_or(Value::Null);

    let resp = match req.method.as_str() {
        // MCP lifecycle
        "initialize" => McpResponse::ok(
            id,
            json!({
                "protocolVersion": "2024-11-05",
                "capabilities": { "tools": {} },
                "serverInfo": {
                    "name": "verl-studio",
                    "version": "0.1.0"
                }
            }),
        ),

        "tools/list" => McpResponse::ok(id, tool_list()),

        "tools/call" => {
            let params = req.params.unwrap_or(Value::Null);
            let tool_name = params["name"].as_str().unwrap_or("").to_string();
            let tool_input = params["arguments"].clone();

            match tool_name.as_str() {
                "get_config" => {
                    let guard = state.flow_config.lock().await;
                    match &*guard {
                        Some(yaml) => McpResponse::ok(
                            id,
                            json!({
                                "content": [{
                                    "type": "text",
                                    "text": yaml
                                }]
                            }),
                        ),
                        None => McpResponse::ok(
                            id,
                            json!({
                                "content": [{
                                    "type": "text",
                                    "text": "No configuration loaded yet. Open VeRL Studio and load or create a pipeline."
                                }]
                            }),
                        ),
                    }
                }

                "set_config" => {
                    let yaml = tool_input["yaml"].as_str().unwrap_or("").to_string();
                    if yaml.is_empty() {
                        McpResponse::err(id, -32602, "Missing required argument: yaml")
                    } else {
                        // Store the new config and emit an event to the frontend
                        {
                            let mut guard = state.flow_config.lock().await;
                            *guard = Some(yaml.clone());
                        }
                        let _ = state.app.emit("mcp:set_config", yaml);
                        McpResponse::ok(
                            id,
                            json!({
                                "content": [{
                                    "type": "text",
                                    "text": "Configuration imported into VeRL Studio."
                                }]
                            }),
                        )
                    }
                }

                "get_status" => {
                    let has_config = state.flow_config.lock().await.is_some();
                    McpResponse::ok(
                        id,
                        json!({
                            "content": [{
                                "type": "text",
                                "text": format!(
                                    "VeRL Studio MCP server running on port 5174.\nConfig loaded: {}.\nTo use: connect Claude desktop to http://localhost:5174/mcp",
                                    if has_config { "yes" } else { "no" }
                                )
                            }]
                        }),
                    )
                }

                "suggest_config" => {
                    let model = tool_input["model"].as_str().unwrap_or("Qwen/Qwen2.5-7B-Instruct");
                    let algorithm = tool_input["algorithm"].as_str().unwrap_or("grpo");
                    let n_gpus = tool_input["n_gpus"].as_u64().unwrap_or(8) as usize;
                    let suggestion = generate_config_suggestion(model, algorithm, n_gpus);
                    McpResponse::ok(
                        id,
                        json!({
                            "content": [{
                                "type": "text",
                                "text": suggestion
                            }]
                        }),
                    )
                }

                unknown => McpResponse::err(id, -32601, format!("Unknown tool: {unknown}")),
            }
        }

        // Notifications (fire-and-forget, no response needed)
        "notifications/initialized" => McpResponse::ok(id, Value::Null),

        unknown => McpResponse::err(id, -32601, format!("Unknown method: {unknown}")),
    };

    Json(resp)
}

fn generate_config_suggestion(model: &str, algorithm: &str, n_gpus: usize) -> String {
    let mini_batch = if n_gpus >= 8 { 256 } else { 64 };
    let micro_batch = if n_gpus >= 8 { 8 } else { 4 };
    let rollout_n = if algorithm == "ppo" { 1 } else { 8 };

    format!(
        r#"# VeRL Studio suggested config for {model} with {algorithm} on {n_gpus}×GPU
data:
  train_files: ["data/train.parquet"]
  val_files: ["data/val.parquet"]
  train_batch_size: {mini_batch}
  max_prompt_length: 512
  max_response_length: 1024
  prompt_key: prompt
  response_key: response

actor_rollout_ref:
  model:
    path: {model}
    dtype: bfloat16
  actor:
    strategy: fsdp
    lr: 1.0e-6
    ppo_mini_batch_size: {mini_batch}
    ppo_micro_batch_size_per_gpu: {micro_batch}
  rollout:
    name: vllm
    n: {rollout_n}
    temperature: 1.0
    max_tokens: 1024
    gpu_memory_utilization: 0.85

algorithm:
  adv_estimator: {algorithm}
  gamma: 1.0
  lam: 1.0

trainer:
  total_epochs: 15
  nnodes: 1
  n_gpus_per_node: {n_gpus}
  save_freq: 5
  test_freq: 5

ray_kwargs:
  ray_init: {{}}
"#
    )
}

// ── Server startup ────────────────────────────────────────────────────────────

pub async fn start_mcp_server(flow_config: SharedFlowConfig, app: AppHandle) {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::POST, Method::OPTIONS])
        .allow_headers(Any);

    let server_state = McpServerState {
        flow_config,
        app,
    };

    let router = Router::new()
        .route("/mcp", post(handle_mcp))
        .layer(cors)
        .with_state(server_state);

    match tokio::net::TcpListener::bind("127.0.0.1:5174").await {
        Ok(listener) => {
            tracing::info!("MCP server listening on http://127.0.0.1:5174/mcp");
            if let Err(e) = axum::serve(listener, router).await {
                tracing::error!("MCP server error: {e}");
            }
        }
        Err(e) => {
            tracing::warn!("Could not start MCP server on port 5174: {e}");
        }
    }
}
