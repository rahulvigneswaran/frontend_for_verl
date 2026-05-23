use crate::commands::utils::expand_tilde;
use crate::models::verl_config::{ValidationError, ValidationSeverity, VerlConfig};
use std::path::PathBuf;

#[tauri::command]
pub async fn parse_yaml_string(yaml: String) -> Result<VerlConfig, String> {
    serde_yaml::from_str::<VerlConfig>(&yaml)
        .map_err(|e| format!("Failed to parse YAML: {e}"))
}

#[tauri::command]
pub async fn parse_yaml(path: String) -> Result<VerlConfig, String> {
    let path = expand_tilde(&path);
    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to read file: {e}"))?;

    serde_yaml::from_str::<VerlConfig>(&content)
        .map_err(|e| format!("Failed to parse YAML: {e}"))
}

#[tauri::command]
pub async fn serialize_yaml(config: VerlConfig) -> Result<String, String> {
    serde_yaml::to_string(&config).map_err(|e| format!("Failed to serialize config: {e}"))
}

#[tauri::command]
pub async fn save_yaml(config: VerlConfig, path: String) -> Result<(), String> {
    let yaml =
        serde_yaml::to_string(&config).map_err(|e| format!("Failed to serialize config: {e}"))?;

    let expanded = expand_tilde(&path);
    let path = PathBuf::from(&expanded);
    if let Some(parent) = path.parent() {
        tokio::fs::create_dir_all(parent)
            .await
            .map_err(|e| format!("Failed to create directories '{}': {e}", parent.display()))?;
    }

    tokio::fs::write(&path, yaml)
        .await
        .map_err(|e| format!("Failed to write file '{}': {e}", path.display()))
}

#[tauri::command]
pub async fn validate_config(config: VerlConfig) -> Result<Vec<ValidationError>, String> {
    let mut errors = Vec::new();

    if let Some(ref arr) = config.actor_rollout_ref {
        if let Some(ref model) = arr.model {
            if model.path.as_deref().unwrap_or("").is_empty() {
                errors.push(ValidationError {
                    field: "actor_rollout_ref.model.path".into(),
                    message: "Model path is required".into(),
                    severity: ValidationSeverity::Error,
                });
            }
        } else {
            errors.push(ValidationError {
                field: "actor_rollout_ref.model".into(),
                message: "Model configuration is required".into(),
                severity: ValidationSeverity::Error,
            });
        }
    }

    if let Some(ref data) = config.data {
        if data.train_files.as_ref().map(|v| v.is_empty()).unwrap_or(true) {
            errors.push(ValidationError {
                field: "data.train_files".into(),
                message: "At least one training file is required".into(),
                severity: ValidationSeverity::Warning,
            });
        }
        if let Some(bs) = data.train_batch_size {
            if bs == 0 {
                errors.push(ValidationError {
                    field: "data.train_batch_size".into(),
                    message: "Batch size must be greater than 0".into(),
                    severity: ValidationSeverity::Error,
                });
            }
        }
    }

    if let Some(ref trainer) = config.trainer {
        if trainer.n_gpus_per_node.unwrap_or(0) == 0 {
            errors.push(ValidationError {
                field: "trainer.n_gpus_per_node".into(),
                message: "At least 1 GPU per node is required".into(),
                severity: ValidationSeverity::Warning,
            });
        }
    }

    Ok(errors)
}

#[tauri::command]
pub async fn list_templates() -> Result<Vec<serde_json::Value>, String> {
    Ok(vec![
        serde_json::json!({
            "id": "qwen25_7b_ppo",
            "name": "Qwen2.5-7B PPO",
            "description": "Standard PPO training with Qwen2.5-7B using FSDP",
            "algorithm": "ppo",
            "model": "Qwen/Qwen2.5-7B-Instruct"
        }),
        serde_json::json!({
            "id": "qwen25_7b_grpo",
            "name": "Qwen2.5-7B GRPO",
            "description": "GRPO training with Qwen2.5-7B (no critic needed)",
            "algorithm": "grpo",
            "model": "Qwen/Qwen2.5-7B-Instruct"
        }),
        serde_json::json!({
            "id": "deepseek_r1_grpo",
            "name": "DeepSeek-R1-Distill GRPO",
            "description": "GRPO fine-tuning of DeepSeek-R1-Distill-Qwen-7B",
            "algorithm": "grpo",
            "model": "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B"
        }),
        serde_json::json!({
            "id": "llama3_8b_ppo",
            "name": "Llama-3.1-8B PPO",
            "description": "PPO with Llama 3.1 8B Instruct",
            "algorithm": "ppo",
            "model": "meta-llama/Llama-3.1-8B-Instruct"
        }),
        serde_json::json!({
            "id": "qwen25_7b_dapo",
            "name": "Qwen2.5-7B DAPO",
            "description": "DAPO training (clip-higher + dynamic sampling)",
            "algorithm": "dapo",
            "model": "Qwen/Qwen2.5-7B-Instruct"
        }),
    ])
}
