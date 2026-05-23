import React, { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useFlowStore, isValidConnection } from "./store/flowStore";
import { NODE_TYPES } from "./nodes";
import { Toolbar } from "./components/Toolbar";
import { Sidebar } from "./components/Sidebar";
import { RightPanel } from "./components/RightPanel";
import { NodeEditModal } from "./panels/NodeEditModal";
import { EDGE_DEFAULTS } from "./lib/edgeDefaults";
import type { AnyNodeData, NodeType } from "./lib/types";
import { listen } from "@tauri-apps/api/event";
import { syncFlowConfig, serializeYaml } from "./lib/tauri";
import { flowNodesToVerlConfig, verlConfigToFlowNodes } from "./lib/configConverter";

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
  model: "#6366f1", dataset: "#10b981", actor: "#f59e0b", rollout: "#3b82f6",
  critic: "#8b5cf6", rewardModel: "#ec4899", customReward: "#f43f5e",
  agent: "#a855f7", algorithm: "#ef4444", trainer: "#14b8a6",
  logger: "#f97316", ray: "#06b6d4", ssh: "#84cc16",
};

const MIN_PANEL = 160;
const MAX_PANEL = 520;

let idCounter = 1;

function usePanelResize(initial: number) {
  const [width, setWidth] = useState(initial);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, direction: "right" | "left") => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startW.current = width;

      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - startX.current;
        const next = direction === "right"
          ? Math.min(MAX_PANEL, Math.max(MIN_PANEL, startW.current + delta))
          : Math.min(MAX_PANEL, Math.max(MIN_PANEL, startW.current - delta));
        setWidth(next);
      };
      const onUp = () => {
        dragging.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [width]
  );

  return { width, onMouseDown };
}

export default function App() {
  const {
    nodes, edges, algorithm,
    onNodesChange, onEdgesChange, onConnect,
    addNode, setNodes, setEdges, setSelectedNodeId,
  } = useFlowStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<{
    screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number };
    getViewport: () => { x: number; y: number; zoom: number };
  } | null>(null);
  const [modalNodeId, setModalNodeId] = useState<string | null>(null);

  // Sync flow config to MCP server (debounced)
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      try {
        const config = flowNodesToVerlConfig(nodes as Node<AnyNodeData>[], algorithm);
        const yaml = await serializeYaml(config);
        await syncFlowConfig(yaml);
      } catch {
        // non-fatal: MCP sync is best-effort
      }
    }, 800);
    return () => { if (syncTimer.current) clearTimeout(syncTimer.current); };
  }, [nodes, algorithm]);

  // Listen for MCP set_config events (Claude desktop pushing a new config)
  useEffect(() => {
    const unlistenPromise = listen<string>("mcp:set_config", async (event) => {
      try {
        const { parseYamlString } = await import("./lib/tauri");
        const config = await parseYamlString(event.payload);
        const importedNodes = verlConfigToFlowNodes(config, algorithm);
        setNodes(importedNodes as Node<AnyNodeData>[]);
        setEdges([]);
      } catch {
        // best-effort
      }
    });
    return () => { unlistenPromise.then((unlisten) => unlisten()); };
  }, [algorithm, setNodes, setEdges]);

  const left = usePanelResize(224);
  const right = usePanelResize(288);

  const makeNode = useCallback(
    (type: NodeType, position: { x: number; y: number }): Node<AnyNodeData> => {
      const defaultData = DEFAULT_NODE_DATA[type]?.() ?? { label: type, nodeType: type };
      return {
        id: `${type}-dropped-${idCounter++}`,
        type,
        position,
        data: defaultData as AnyNodeData,
      };
    },
    []
  );

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/reactflow") as NodeType;
      if (!type || !reactFlowInstance) return;
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(makeNode(type, position));
    },
    [reactFlowInstance, addNode, makeNode]
  );

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Click-to-add: places node at current viewport center
  const handleAddNode = useCallback(
    (type: NodeType) => {
      let position = { x: 400, y: 300 };
      if (reactFlowInstance && reactFlowWrapper.current) {
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        position = reactFlowInstance.screenToFlowPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
      addNode(makeNode(type, position));
    },
    [reactFlowInstance, addNode, makeNode]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => { setSelectedNodeId(node.id); },
    [setSelectedNodeId]
  );

  const onNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => { setSelectedNodeId(node.id); setModalNodeId(node.id); },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => { setSelectedNodeId(null); }, [setSelectedNodeId]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <Toolbar />

      <div className="flex flex-1 min-h-0">
        {/* Left sidebar */}
        <div className="flex-none flex h-full" style={{ width: left.width }}>
          <div className="flex-1 min-w-0 h-full overflow-hidden">
            <Sidebar onAddNode={handleAddNode} />
          </div>
          {/* Left resize handle */}
          <div
            className="w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary/70 transition-colors group relative shrink-0"
            onMouseDown={(e) => left.onMouseDown(e, "right")}
            title="Drag to resize"
          >
            <div className="absolute inset-y-0 left-0 w-px bg-border group-hover:bg-primary/50 transition-colors" />
          </div>
        </div>

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
            defaultEdgeOptions={EDGE_DEFAULTS}
            isValidConnection={isValidConnection}
            onInit={setReactFlowInstance as (instance: unknown) => void}
            fitView
            fitViewOptions={{ padding: 0.1 }}
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode="Delete"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="hsl(222 47% 18%)" />
            <Controls />
            <MiniMap
              nodeColor={(node) => MINIMAP_COLORS[node.type ?? ""] ?? "#6b7280"}
              style={{ background: "hsl(222 47% 11%)" }}
              maskColor="hsl(222 47% 9% / 70%)"
            />
          </ReactFlow>
        </div>

        {/* Right resize handle */}
        <div
          className="w-1 h-full cursor-col-resize hover:bg-primary/50 active:bg-primary/70 transition-colors group relative shrink-0"
          onMouseDown={(e) => right.onMouseDown(e, "left")}
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 right-0 w-px bg-border group-hover:bg-primary/50 transition-colors" />
        </div>

        {/* Right panel */}
        <div className="flex-none h-full" style={{ width: right.width }}>
          <RightPanel />
        </div>
      </div>

      {modalNodeId && (
        <NodeEditModal nodeId={modalNodeId} onClose={() => setModalNodeId(null)} />
      )}
    </div>
  );
}
