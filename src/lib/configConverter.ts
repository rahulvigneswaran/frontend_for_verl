import type { Node } from "@xyflow/react";
import type {
  AnyNodeData,
  VerlConfig,
  Algorithm,
  TrainerConfig,
} from "./types";

export function flowNodesToVerlConfig(
  nodes: Node<AnyNodeData>[],
  algorithm: Algorithm
): VerlConfig {
  const config: VerlConfig = {};

  for (const node of nodes) {
    const data = node.data;
    if (!data) continue;

    switch (data.nodeType) {
      case "dataset": {
        config.data = data.config;
        break;
      }

      case "model": {
        if (!config.actor_rollout_ref) config.actor_rollout_ref = {};
        config.actor_rollout_ref.model = data.config;
        if (config.critic) {
          config.critic.model = data.config;
        }
        break;
      }

      case "actor": {
        if (!config.actor_rollout_ref) config.actor_rollout_ref = {};
        config.actor_rollout_ref.actor = data.config;
        config.actor_rollout_ref.hybrid_engine = true;
        config.actor_rollout_ref.ref = {
          strategy: data.config.strategy ?? "fsdp",
        };
        break;
      }

      case "rollout": {
        if (!config.actor_rollout_ref) config.actor_rollout_ref = {};
        config.actor_rollout_ref.rollout = data.config;
        break;
      }

      case "critic": {
        if (algorithm === "ppo") {
          config.critic = data.config;
        }
        break;
      }

      case "rewardModel": {
        config.reward_model = data.config;
        break;
      }

      case "customReward": {
        config.custom_reward_function = data.config;
        break;
      }

      case "algorithm": {
        config.algorithm = data.config;
        if (!config.algorithm.adv_estimator) {
          config.algorithm.adv_estimator = algorithm === "ppo" ? "gae" : algorithm;
        }
        break;
      }

      case "trainer": {
        config.trainer = data.config;
        break;
      }

      case "logger": {
        if (!config.trainer) config.trainer = {};
        (config.trainer as TrainerConfig).logger = data.loggers;
        (config.trainer as TrainerConfig).project_name = data.projectName;
        (config.trainer as TrainerConfig).experiment_name = data.experimentName;
        break;
      }

      case "ray": {
        config.ray_kwargs = data.config;
        break;
      }
    }
  }

  return config;
}

export function verlConfigToFlowNodes(
  config: VerlConfig,
  algorithm: Algorithm
): Node<AnyNodeData>[] {
  const nodes: Node<AnyNodeData>[] = [];
  let x = 80;
  const y = 200;
  const xStep = 260;

  const makeId = (type: string) => `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  if (config.data) {
    nodes.push({
      id: makeId("dataset"),
      type: "dataset",
      position: { x, y: y - 100 },
      data: { label: "Dataset", nodeType: "dataset", config: config.data },
    });
  }

  if (config.actor_rollout_ref?.model) {
    nodes.push({
      id: makeId("model"),
      type: "model",
      position: { x, y },
      data: {
        label: "Model",
        nodeType: "model",
        config: config.actor_rollout_ref.model,
      },
    });
    x += xStep;
  }

  if (config.actor_rollout_ref?.actor) {
    nodes.push({
      id: makeId("actor"),
      type: "actor",
      position: { x, y },
      data: {
        label: "Actor",
        nodeType: "actor",
        config: config.actor_rollout_ref.actor,
      },
    });
    x += xStep;
  }

  if (config.actor_rollout_ref?.rollout) {
    nodes.push({
      id: makeId("rollout"),
      type: "rollout",
      position: { x, y },
      data: {
        label: "Rollout Engine",
        nodeType: "rollout",
        config: config.actor_rollout_ref.rollout,
      },
    });
    x += xStep;
  }

  if (config.critic && algorithm === "ppo") {
    nodes.push({
      id: makeId("critic"),
      type: "critic",
      position: { x, y: y + 160 },
      data: { label: "Critic", nodeType: "critic", config: config.critic },
    });
  }

  if (config.reward_model) {
    nodes.push({
      id: makeId("rewardModel"),
      type: "rewardModel",
      position: { x, y: y - 100 },
      data: {
        label: "Reward Model",
        nodeType: "rewardModel",
        config: config.reward_model,
      },
    });
    x += xStep;
  }

  if (config.algorithm) {
    nodes.push({
      id: makeId("algorithm"),
      type: "algorithm",
      position: { x, y },
      data: {
        label: "Algorithm",
        nodeType: "algorithm",
        algorithm,
        config: config.algorithm,
      },
    });
    x += xStep;
  }

  if (config.trainer) {
    const loggers = (config.trainer as TrainerConfig).logger ?? ["console"];
    const projectName = (config.trainer as TrainerConfig).project_name ?? "verl_examples";
    const experimentName = (config.trainer as TrainerConfig).experiment_name ?? "experiment";

    nodes.push({
      id: makeId("logger"),
      type: "logger",
      position: { x, y: y - 100 },
      data: {
        label: "Logger",
        nodeType: "logger",
        loggers,
        projectName,
        experimentName,
      },
    });

    nodes.push({
      id: makeId("trainer"),
      type: "trainer",
      position: { x, y },
      data: { label: "Trainer", nodeType: "trainer", config: config.trainer },
    });
    x += xStep;
  }

  if (config.ray_kwargs) {
    nodes.push({
      id: makeId("ray"),
      type: "ray",
      position: { x, y },
      data: {
        label: "Ray Cluster",
        nodeType: "ray",
        config: config.ray_kwargs,
      },
    });
  }

  return nodes;
}
