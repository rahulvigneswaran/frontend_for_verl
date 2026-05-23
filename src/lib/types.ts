export type Algorithm = "ppo" | "grpo" | "dapo" | "rloo" | "reinforce_pp";

export interface VerlConfig {
  data?: DataConfig;
  actor_rollout_ref?: ActorRolloutRefConfig;
  critic?: CriticConfig;
  reward_model?: RewardModelConfig;
  custom_reward_function?: CustomRewardConfig;
  algorithm?: AlgorithmConfig;
  trainer?: TrainerConfig;
  ray_kwargs?: RayConfig;
  [key: string]: unknown;
}

export interface DataConfig {
  source?: "local" | "huggingface";
  train_files?: string[];
  val_files?: string[];
  hf_dataset?: string;
  hf_subset?: string;
  hf_train_split?: string;
  hf_val_split?: string;
  train_batch_size?: number;
  val_batch_size?: number;
  max_prompt_length?: number;
  max_response_length?: number;
  prompt_key?: string;
  response_key?: string;
  [key: string]: unknown;
}

export interface ActorRolloutRefConfig {
  model?: ModelConfig;
  actor?: ActorConfig;
  rollout?: RolloutConfig;
  ref?: RefModelConfig;
  hybrid_engine?: boolean;
  [key: string]: unknown;
}

export interface ModelConfig {
  path?: string;
  dtype?: string;
  use_fused_kernels?: boolean;
  enable_gradient_checkpointing?: boolean;
  [key: string]: unknown;
}

export interface ActorConfig {
  strategy?: string;
  lr?: number;
  lr_warmup_steps?: number;
  ppo_mini_batch_size?: number;
  ppo_micro_batch_size_per_gpu?: number;
  ppo_epochs?: number;
  clip_ratio?: number;
  entropy_coeff?: number;
  use_kl_loss?: boolean;
  kl_loss_coef?: number;
  [key: string]: unknown;
}

export interface RolloutConfig {
  name?: string;
  n?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  tensor_model_parallel_size?: number;
  gpu_memory_utilization?: number;
  [key: string]: unknown;
}

export interface RefModelConfig {
  strategy?: string;
  [key: string]: unknown;
}

export interface CriticConfig {
  strategy?: string;
  lr?: number;
  ppo_mini_batch_size?: number;
  ppo_micro_batch_size_per_gpu?: number;
  ppo_epochs?: number;
  cliprange_value?: number;
  model?: ModelConfig;
  [key: string]: unknown;
}

export interface RewardModelConfig {
  enable?: boolean;
  model?: ModelConfig;
  strategy?: string;
  [key: string]: unknown;
}

export interface CustomRewardConfig {
  path?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AlgorithmConfig {
  adv_estimator?: string;
  gamma?: number;
  lam?: number;
  use_kl_in_reward?: boolean;
  kl_penalty?: string;
  kl_ctrl?: KlCtrlConfig;
  norm_adv_by_std_in_grpo?: boolean;
  [key: string]: unknown;
}

export interface KlCtrlConfig {
  type?: string;
  kl_coef?: number;
  target_kl?: number;
  horizon?: number;
}

export interface TrainerConfig {
  total_epochs?: number;
  total_training_steps?: number;
  project_name?: string;
  experiment_name?: string;
  logger?: string[];
  nnodes?: number;
  n_gpus_per_node?: number;
  save_freq?: number;
  test_freq?: number;
  val_before_train?: boolean;
  default_local_dir?: string;
  resume_mode?: string;
  resume_from_path?: string;
  max_actor_ckpt_to_keep?: number;
  [key: string]: unknown;
}

export interface RayConfig {
  ray_init?: {
    num_cpus?: number;
    address?: string;
    [key: string]: unknown;
  };
  timeline_json_file?: string;
  [key: string]: unknown;
}

// Agent / LangGraph node config
export interface AgentConfig {
  framework?: string;
  module_path?: string;
  agent_class?: string;
  max_steps?: number;
  tools?: string[];
  state_schema?: string;
  env_vars?: Record<string, string>;
}

// Node data types for ReactFlow
export type NodeType =
  | "model"
  | "dataset"
  | "actor"
  | "rollout"
  | "critic"
  | "rewardModel"
  | "customReward"
  | "agent"
  | "algorithm"
  | "trainer"
  | "logger"
  | "ray"
  | "ssh";

export interface BaseNodeData {
  label: string;
  nodeType: NodeType;
  [key: string]: unknown;
}

export interface ModelNodeData extends BaseNodeData { nodeType: "model"; config: ModelConfig }
export interface DatasetNodeData extends BaseNodeData { nodeType: "dataset"; config: DataConfig }
export interface ActorNodeData extends BaseNodeData { nodeType: "actor"; config: ActorConfig }
export interface RolloutNodeData extends BaseNodeData { nodeType: "rollout"; config: RolloutConfig }
export interface CriticNodeData extends BaseNodeData { nodeType: "critic"; config: CriticConfig }
export interface RewardModelNodeData extends BaseNodeData { nodeType: "rewardModel"; config: RewardModelConfig }
export interface CustomRewardNodeData extends BaseNodeData { nodeType: "customReward"; config: CustomRewardConfig }
export interface AgentNodeData extends BaseNodeData { nodeType: "agent"; config: AgentConfig }
export interface AlgorithmNodeData extends BaseNodeData { nodeType: "algorithm"; algorithm: Algorithm; config: AlgorithmConfig }
export interface TrainerNodeData extends BaseNodeData { nodeType: "trainer"; config: TrainerConfig }
export interface LoggerNodeData extends BaseNodeData { nodeType: "logger"; loggers: string[]; projectName: string; experimentName: string }
export interface RayNodeData extends BaseNodeData { nodeType: "ray"; config: RayConfig }
export interface SshNodeData extends BaseNodeData {
  nodeType: "ssh";
  host: string;
  port: number;
  username: string;
  authType: "password" | "key" | "agent";
  keyPath?: string;
  remoteWorkDir: string;
  pythonCmd: string;
}

export type AnyNodeData =
  | ModelNodeData | DatasetNodeData | ActorNodeData | RolloutNodeData
  | CriticNodeData | RewardModelNodeData | CustomRewardNodeData | AgentNodeData
  | AlgorithmNodeData | TrainerNodeData | LoggerNodeData | RayNodeData | SshNodeData;

// Job types
export type JobStatus = "pending" | "running" | "done" | "failed" | "stopped";
export interface Job {
  id: string; name: string; status: JobStatus;
  created_at: string; started_at?: string; finished_at?: string;
  working_dir: string; config_path: string;
  is_remote: boolean; remote_host?: string;
}
export interface LogLine { job_id: string; line: string; timestamp: string; stream: "stdout" | "stderr" }
export interface MetricsSnapshot { job_id: string; step: number; epoch?: number; metrics: Record<string, number>; timestamp: string }
export interface ValidationError { field: string; message: string; severity: "error" | "warning" }
export interface Template { id: string; name: string; description: string; algorithm: Algorithm; model: string }
