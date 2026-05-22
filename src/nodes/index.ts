import { ModelNode } from "./ModelNode";
import { DatasetNode } from "./DatasetNode";
import { ActorNode } from "./ActorNode";
import { RolloutNode } from "./RolloutNode";
import { CriticNode } from "./CriticNode";
import { RewardModelNode } from "./RewardModelNode";
import { CustomRewardNode } from "./CustomRewardNode";
import { AgentNode } from "./AgentNode";
import { AlgorithmNode } from "./AlgorithmNode";
import { TrainerNode } from "./TrainerNode";
import { LoggerNode } from "./LoggerNode";
import { RayNode } from "./RayNode";
import { SshNode } from "./SshNode";

export const NODE_TYPES = {
  model: ModelNode,
  dataset: DatasetNode,
  actor: ActorNode,
  rollout: RolloutNode,
  critic: CriticNode,
  rewardModel: RewardModelNode,
  customReward: CustomRewardNode,
  agent: AgentNode,
  algorithm: AlgorithmNode,
  trainer: TrainerNode,
  logger: LoggerNode,
  ray: RayNode,
  ssh: SshNode,
} as const;
