import type { NodeType } from "./types";

export type PortType =
  | "model_weights"
  | "training_data"
  | "actor_setup"
  | "rollout_output"
  | "value_estimates"
  | "reward_signal"
  | "agent_trajectory"
  | "algorithm_updates"
  | "log_config"
  | "training_job";

export const PORT_COLORS: Record<PortType, string> = {
  model_weights: "#6366f1",
  training_data: "#10b981",
  actor_setup: "#f59e0b",
  rollout_output: "#3b82f6",
  value_estimates: "#8b5cf6",
  reward_signal: "#ec4899",
  agent_trajectory: "#a855f7",
  algorithm_updates: "#ef4444",
  log_config: "#f97316",
  training_job: "#14b8a6",
};

export interface PortDef {
  id: string;
  type: PortType;
  label: string;
}

export const NODE_INPUT_PORTS: Partial<Record<NodeType, PortDef[]>> = {
  actor: [
    { id: "in-model_weights", type: "model_weights", label: "Model" },
    { id: "in-training_data", type: "training_data", label: "Data" },
  ],
  rollout: [
    { id: "in-actor_setup", type: "actor_setup", label: "Actor" },
  ],
  critic: [
    { id: "in-actor_setup", type: "actor_setup", label: "Actor" },
  ],
  rewardModel: [
    { id: "in-rollout_output", type: "rollout_output", label: "Rollout" },
  ],
  customReward: [
    { id: "in-rollout_output", type: "rollout_output", label: "Rollout" },
  ],
  agent: [
    { id: "in-rollout_output", type: "rollout_output", label: "Rollout" },
  ],
  algorithm: [
    { id: "in-rollout_output", type: "rollout_output", label: "Rollout" },
    { id: "in-agent_trajectory", type: "agent_trajectory", label: "Agent" },
    { id: "in-value_estimates", type: "value_estimates", label: "Values" },
    { id: "in-reward_signal", type: "reward_signal", label: "Reward" },
  ],
  trainer: [
    { id: "in-algorithm_updates", type: "algorithm_updates", label: "Algorithm" },
    { id: "in-log_config", type: "log_config", label: "Logs" },
  ],
  ray: [
    { id: "in-training_job", type: "training_job", label: "Training" },
  ],
};

export const NODE_OUTPUT_PORTS: Partial<Record<NodeType, PortDef[]>> = {
  model: [
    { id: "out-model_weights", type: "model_weights", label: "Weights" },
  ],
  dataset: [
    { id: "out-training_data", type: "training_data", label: "Data" },
  ],
  actor: [
    { id: "out-actor_setup", type: "actor_setup", label: "Actor" },
  ],
  rollout: [
    { id: "out-rollout_output", type: "rollout_output", label: "Generated" },
  ],
  critic: [
    { id: "out-value_estimates", type: "value_estimates", label: "Values" },
  ],
  rewardModel: [
    { id: "out-reward_signal", type: "reward_signal", label: "Reward" },
  ],
  customReward: [
    { id: "out-reward_signal", type: "reward_signal", label: "Reward" },
  ],
  agent: [
    { id: "out-agent_trajectory", type: "agent_trajectory", label: "Trajectory" },
  ],
  algorithm: [
    { id: "out-algorithm_updates", type: "algorithm_updates", label: "Updates" },
  ],
  logger: [
    { id: "out-log_config", type: "log_config", label: "Logs" },
  ],
  trainer: [
    { id: "out-training_job", type: "training_job", label: "Job" },
  ],
};

export function portTypeFromHandle(handleId: string | null | undefined): PortType | null {
  if (!handleId) return null;
  const type = handleId.replace(/^(in|out)-/, "") as PortType;
  return type in PORT_COLORS ? type : null;
}

export function edgeColorFromHandle(sourceHandle: string | null | undefined): string {
  const type = portTypeFromHandle(sourceHandle);
  return type ? PORT_COLORS[type] : "#64748b";
}
