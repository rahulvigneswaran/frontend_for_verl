import type { Node, Edge } from "@xyflow/react";
import type { AnyNodeData, Algorithm } from "./types";
import { EDGE_DEFAULTS } from "./edgeDefaults";

function e(id: string, source: string, target: string): Edge {
  return { id, source, target, ...EDGE_DEFAULTS };
}

interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  algorithm: Algorithm;
  model: string;
  nodes: Node<AnyNodeData>[];
  edges: Edge[];
}

export function buildTemplate(
  algorithm: Algorithm,
  modelPath: string
): { nodes: Node<AnyNodeData>[]; edges: Edge[] } {
  const isGrpoLike = algorithm !== "ppo";

  const nodes: Node<AnyNodeData>[] = [
    {
      id: "dataset",
      type: "dataset",
      position: { x: 80, y: 60 },
      data: {
        label: "Dataset",
        nodeType: "dataset",
        config: {
          train_files: ["data/train.parquet"],
          val_files: ["data/val.parquet"],
          train_batch_size: 256,
          val_batch_size: 256,
          max_prompt_length: 512,
          max_response_length: 1024,
          prompt_key: "prompt",
          response_key: "response",
        },
      },
    },
    {
      id: "model",
      type: "model",
      position: { x: 80, y: 280 },
      data: {
        label: "Model",
        nodeType: "model",
        config: {
          path: modelPath,
          dtype: "bfloat16",
          use_fused_kernels: false,
          enable_gradient_checkpointing: false,
        },
      },
    },
    {
      id: "actor",
      type: "actor",
      position: { x: 360, y: 280 },
      data: {
        label: "Actor",
        nodeType: "actor",
        config: {
          strategy: "fsdp",
          lr: 1e-6,
          lr_warmup_steps: -1,
          ppo_mini_batch_size: 32,
          ppo_micro_batch_size_per_gpu: 4,
          ppo_epochs: 1,
          clip_ratio: 0.2,
          entropy_coeff: 0.001,
          use_kl_loss: isGrpoLike,
          kl_loss_coef: 0.001,
        },
      },
    },
    {
      id: "rollout",
      type: "rollout",
      position: { x: 640, y: 280 },
      data: {
        label: "Rollout Engine",
        nodeType: "rollout",
        config: {
          name: "vllm",
          n: isGrpoLike ? 8 : 1,
          temperature: 1.0,
          top_p: 1.0,
          top_k: -1,
          max_tokens: 1024,
          tensor_model_parallel_size: 1,
          gpu_memory_utilization: 0.85,
        },
      },
    },
    {
      id: "algorithm",
      type: "algorithm",
      position: { x: 920, y: 280 },
      data: {
        label: "Algorithm",
        nodeType: "algorithm",
        algorithm,
        config: {
          adv_estimator: algorithm === "ppo" ? "gae" : algorithm,
          gamma: 1.0,
          lam: 1.0,
          use_kl_in_reward: algorithm === "ppo",
          kl_penalty: "kl",
          kl_ctrl: {
            type: "fixed",
            kl_coef: 0.001,
            target_kl: 0.1,
            horizon: 10000,
          },
          norm_adv_by_std_in_grpo: true,
        },
      },
    },
    {
      id: "logger",
      type: "logger",
      position: { x: 1200, y: 60 },
      data: {
        label: "Logger",
        nodeType: "logger",
        loggers: ["console", "wandb"],
        projectName: "verl_examples",
        experimentName: `${algorithm}_experiment`,
      },
    },
    {
      id: "trainer",
      type: "trainer",
      position: { x: 1200, y: 280 },
      data: {
        label: "Trainer",
        nodeType: "trainer",
        config: {
          total_epochs: 15,
          nnodes: 1,
          n_gpus_per_node: 8,
          save_freq: 5,
          test_freq: 5,
          val_before_train: true,
          default_local_dir: "checkpoints/${trainer.project_name}/${trainer.experiment_name}",
          resume_mode: "auto",
          max_actor_ckpt_to_keep: 3,
        },
      },
    },
    {
      id: "ray",
      type: "ray",
      position: { x: 1480, y: 280 },
      data: {
        label: "Ray Cluster",
        nodeType: "ray",
        config: {
          ray_init: {
            num_cpus: undefined,
            address: undefined,
          },
        },
      },
    },
  ];

  if (algorithm === "ppo") {
    nodes.push({
      id: "critic",
      type: "critic",
      position: { x: 640, y: 500 },
      data: {
        label: "Critic",
        nodeType: "critic",
        config: {
          strategy: "fsdp",
          lr: 1e-5,
          ppo_mini_batch_size: 32,
          ppo_micro_batch_size_per_gpu: 4,
          ppo_epochs: 1,
          cliprange_value: 0.5,
        },
      },
    });
  }

  const edges: Edge[] = [
    e("e-dataset-actor", "dataset", "actor"),
    e("e-model-actor", "model", "actor"),
    e("e-actor-rollout", "actor", "rollout"),
    e("e-rollout-algorithm", "rollout", "algorithm"),
    e("e-algorithm-trainer", "algorithm", "trainer"),
    e("e-logger-trainer", "logger", "trainer"),
    e("e-trainer-ray", "trainer", "ray"),
    ...(algorithm === "ppo" ? [e("e-critic", "actor", "critic")] : []),
  ];

  return { nodes, edges };
}

export function buildAgentTemplate(
  modelPath: string
): { nodes: Node<AnyNodeData>[]; edges: Edge[] } {
  const base = buildTemplate("grpo", modelPath);

  const agentNode: Node<AnyNodeData> = {
    id: "agent",
    type: "agent",
    position: { x: 920, y: 280 },
    data: {
      label: "Agent",
      nodeType: "agent",
      config: {
        framework: "langgraph",
        agent_class: "my_project.agents.ReasoningAgent",
        module_path: "",
        max_steps: 10,
        tools: ["search", "calculator"],
        state_schema: "",
      },
    },
  };

  // Shift algorithm + trainer + logger + ray rightward to make room
  const shifted = base.nodes.map((n) => {
    if (["algorithm", "trainer", "logger", "ray"].includes(n.id)) {
      return { ...n, position: { x: n.position.x + 280, y: n.position.y } };
    }
    return n;
  });

  const nodes = [...shifted, agentNode];
  const edges: Edge[] = [
    ...base.edges.filter((e) => e.id !== "e-rollout-algorithm"),
    e("e-rollout-agent", "rollout", "agent"),
    e("e-agent-algorithm", "agent", "algorithm"),
  ];

  return { nodes, edges };
}

export const TEMPLATES: FlowTemplate[] = [
  {
    id: "qwen25_7b_ppo",
    name: "Qwen2.5-7B PPO",
    description: "Standard PPO with FSDP on 8×A100/H100",
    algorithm: "ppo",
    model: "Qwen/Qwen2.5-7B-Instruct",
    ...buildTemplate("ppo", "Qwen/Qwen2.5-7B-Instruct"),
  },
  {
    id: "qwen25_7b_grpo",
    name: "Qwen2.5-7B GRPO",
    description: "GRPO (no critic) with vLLM rollout",
    algorithm: "grpo",
    model: "Qwen/Qwen2.5-7B-Instruct",
    ...buildTemplate("grpo", "Qwen/Qwen2.5-7B-Instruct"),
  },
  {
    id: "deepseek_r1_grpo",
    name: "DeepSeek-R1 GRPO",
    description: "GRPO fine-tuning of DeepSeek-R1-Distill-Qwen-7B",
    algorithm: "grpo",
    model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
    ...buildTemplate("grpo", "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B"),
  },
  {
    id: "llama31_8b_ppo",
    name: "Llama-3.1-8B PPO",
    description: "PPO with Llama 3.1 8B Instruct",
    algorithm: "ppo",
    model: "meta-llama/Llama-3.1-8B-Instruct",
    ...buildTemplate("ppo", "meta-llama/Llama-3.1-8B-Instruct"),
  },
  {
    id: "qwen25_7b_dapo",
    name: "Qwen2.5-7B DAPO",
    description: "DAPO (clip-higher + dynamic sampling)",
    algorithm: "dapo",
    model: "Qwen/Qwen2.5-7B-Instruct",
    ...buildTemplate("dapo", "Qwen/Qwen2.5-7B-Instruct"),
  },
  {
    id: "qwen25_7b_agent_grpo",
    name: "Qwen2.5-7B Agent GRPO",
    description: "GRPO with LangGraph agentic harness in the rollout loop",
    algorithm: "grpo",
    model: "Qwen/Qwen2.5-7B-Instruct",
    ...buildAgentTemplate("Qwen/Qwen2.5-7B-Instruct"),
  },
];
