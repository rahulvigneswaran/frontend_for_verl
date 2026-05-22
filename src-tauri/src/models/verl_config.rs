use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct VerlConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<DataConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor_rollout_ref: Option<ActorRolloutRefConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub critic: Option<CriticConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reward_model: Option<RewardModelConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_reward_function: Option<CustomRewardConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub algorithm: Option<AlgorithmConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trainer: Option<TrainerConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ray_kwargs: Option<RayConfig>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DataConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub train_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub val_files: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub train_batch_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub val_batch_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_prompt_length: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_response_length: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub prompt_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub response_key: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActorRolloutRefConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<ModelConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub actor: Option<ActorConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rollout: Option<RolloutConfig>,
    #[serde(rename = "ref", skip_serializing_if = "Option::is_none")]
    pub ref_model: Option<RefModelConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hybrid_engine: Option<bool>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModelConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dtype: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub use_fused_kernels: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable_gradient_checkpointing: Option<bool>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActorConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategy: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lr: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lr_warmup_steps: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lr_warmup_style: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ppo_mini_batch_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ppo_micro_batch_size_per_gpu: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ppo_epochs: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub clip_ratio: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entropy_coeff: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub use_kl_loss: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kl_loss_coef: Option<f64>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RolloutConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_k: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tensor_model_parallel_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gpu_memory_utilization: Option<f64>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RefModelConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategy: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CriticConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategy: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lr: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ppo_mini_batch_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ppo_micro_batch_size_per_gpu: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ppo_epochs: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cliprange_value: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<ModelConfig>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RewardModelConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub enable: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub model: Option<ModelConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub strategy: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CustomRewardConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AlgorithmConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub adv_estimator: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gamma: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lam: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub use_kl_in_reward: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kl_penalty: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kl_ctrl: Option<KlCtrlConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub norm_adv_by_std_in_grpo: Option<bool>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct KlCtrlConfig {
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    pub ctrl_type: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub kl_coef: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target_kl: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub horizon: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TrainerConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_epochs: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_training_steps: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experiment_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logger: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub nnodes: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub n_gpus_per_node: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub save_freq: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test_freq: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub val_before_train: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_local_dir: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resume_mode: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resume_from_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_actor_ckpt_to_keep: Option<u32>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RayConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ray_init: Option<RayInitConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timeline_json_file: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RayInitConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub num_cpus: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_yaml::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
    pub severity: ValidationSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ValidationSeverity {
    Error,
    Warning,
}
