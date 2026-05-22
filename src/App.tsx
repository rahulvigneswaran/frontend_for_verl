import React, { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFlowStore } from "./store/flowStore";
import { NODE_TYPES } from "./nodes";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { NodeEditModal } from "./panels/NodeEditModal";
import type { AnyNodeData, NodeType } from "./lib/types";

const DEFAULT_NODE_DATA: Record<NodeType, () => Partial<AnyNodeData>> = {
  model: () => ({ label: "Model", nodeType: "model" as const, config: { path: "", dtype: "bfloat16", use_fused_kernels: false, enable_gradient_checkpointing: false } }),
  dataset: () => ({ label: "Dataset", nodeType: "dataset" as const, config: { train_batch_size: 256, max_prompt_length: 512, max_response_length: 1024, prompt_key: "prompt", response_key: "response" } }),
  actor: () => ({ label: "Actor", nodeType: "actor" as const, config: { strategy: "fsdp", lr: 1e-6, ppo_mini_batch_size: 32, ppo_micro_batch_size_per_gpu: 4, ppo_epochs: 1, clip_ratio: 0.2, entropy_coeff: 0.001 } }),
  rollout: () => ({ label: "Rollout Engine", nodeType: "rollout" as const, config: { name: "vllm", n: 1, temperature: 1.0, top_p: 1.0, max_tokens: 1024, tensor_model_parallel_size: 1, gpu_memory_utilization: 0.85 } }),
  critic: () => ({ label: "Critic", nodeType: "critic" as const, config: { strategy: "fsdp", lr: 1e-5, ppo_mini_batch_size: 32, ppo_micro_batch_size_per_gpu: 4, ppo_epochs: 1, cliprange_value: 0.5 } }),
  rewardModel: () => ({ label: "Reward Model", nodeType: "rewardModel" as const, config: { enable: true, strategy: "fsdp" } }),
  customReward: () => ({ label: "Custom Reward", nodeType: "customReward" as const, config: { path: "", name: "compute_reward" } }),
  agent: () => ({ label: "Agent", nodeType: "agent" as const, config: { framework: "langgraph", agent_class: "", max_steps: 10, tools: [] } }),
  algorithm: () => ({ label: "Algorithm", nodeType: "algorithm" as const, algorithm: "grpo", config: { adv_estimator: "grpo", gamma: 1.0, lam: 1.0, use_kl_in_reward: false, kl_penalty: "kl" } }),
  trainer: () => ({ label: "Trainer", nodeType: "trainer" as const, config: { total_epochs: 15, nnodes: 1, n_gpus_per_node: 8, save_freq: 5, test_freq: 5, val_before_train: true, resume_mode: "auto" } }),
  logger: () => ({ label: "Logger", nodeType: "logger" as const, loggers: ["console", "wandb"], projectName: "verl_examples", experimentName: "experiment" }),
  ray: () => ({ label: "Ray Cluster", nodeType: "ray" as const, config: { ray_init: {} } }),
  ssh: () => ({ label: "SSH Remote", nodeType: "ssh" as const, host: "", port: 22, username: "", authType: "agent", remoteWorkDir: "~/verl_runs", pythonCmd: "python3" }),
};

const MINIMAP_COLORS: Record<string, string> = {
  model: "#6366f1",
  dataset: "#10b981",
  actor: "#f59e0b",
  rollout: "#3b82f6",
  critic: "#8b5cf6",
  rewardModel: "#ec4899",
  customReward: "#f43f5e",
  agent: "#a855f7",
  algorithm: "#ef4444",
  trainer: "#14b8a6",
  logger: "#f97316",
  ray: "#06b6d4",
  ssh: "#84cc16",
};

let idCounter = 1;

export default function App() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNodeId,
    setNodes,
  } = useFlowStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<{
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
  } | null>(null);
  const [modalNodeId, setModalNodeId] = useState<string | null>(null);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type || !reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const defaultData = DEFAULT_NODE_DATA[type]?.() ?? { label: type, nodeType: type };
      const newNode: Node<AnyNodeData> = {
        id: `${type}-dropped-${idCounter++}`,
        type,
        position,
        data: defaultData as AnyNodeData,
      };

      setNodes([...nodes, newNode]);
    },
    [reactFlowInstance, nodes, setNodes]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
      setModalNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        {/* ReactFlow canvas */}
        <div className="flex-1 min-w-0" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            nodeTypes={NODE_TYPES}
            onInit={setReactFlowInstance as (instance: unknown) => void}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode="Delete"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1}
              color="hsl(222 47% 18%)"
            />
            <Controls />
            <MiniMap
              nodeColor={(node) => MINIMAP_COLORS[node.type ?? ""] ?? "#6b7280"}
              style={{ background: "hsl(222 47% 11%)" }}
              maskColor="hsl(222 47% 9% / 70%)"
            />
          </ReactFlow>
        </div>

        <RightPanel />
      </div>

      {/* Double-click node edit modal */}
      {modalNodeId && (
        <NodeEditModal
          nodeId={modalNodeId}
          onClose={() => setModalNodeId(null)}
        />
      )}
    </div>
  );
}
