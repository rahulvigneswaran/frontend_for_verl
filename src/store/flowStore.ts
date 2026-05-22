import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  addEdge,
} from "@xyflow/react";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Algorithm, AnyNodeData } from "../lib/types";
import { buildTemplate } from "../lib/templates";

interface FlowState {
  nodes: Node<AnyNodeData>[];
  edges: Edge[];
  algorithm: Algorithm;
  selectedNodeId: string | null;

  setNodes: (nodes: Node<AnyNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setAlgorithm: (algorithm: Algorithm) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<AnyNodeData>) => void;
  loadTemplate: (algorithm: Algorithm, modelPath?: string) => void;
  resetFlow: () => void;
}

const DEFAULT_ALGORITHM: Algorithm = "grpo";
const DEFAULT_MODEL = "Qwen/Qwen2.5-7B-Instruct";

const initialFlow = buildTemplate(DEFAULT_ALGORITHM, DEFAULT_MODEL);

export const useFlowStore = create<FlowState>()(
  subscribeWithSelector((set) => ({
    nodes: initialFlow.nodes,
    edges: initialFlow.edges,
    algorithm: DEFAULT_ALGORITHM,
    selectedNodeId: null,

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    onNodesChange: (changes) =>
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes) as Node<AnyNodeData>[],
      })),

    onEdgesChange: (changes) =>
      set((state) => ({
        edges: applyEdgeChanges(changes, state.edges),
      })),

    onConnect: (connection) =>
      set((state) => ({
        edges: addEdge({ ...connection, animated: false }, state.edges),
      })),

    setAlgorithm: (algorithm) =>
      set((state) => {
        const modelNode = state.nodes.find((n) => n.data.nodeType === "model");
        const modelPath =
          (modelNode?.data as { config?: { path?: string } })?.config?.path ?? DEFAULT_MODEL;
        const flow = buildTemplate(algorithm, modelPath);
        return { algorithm, nodes: flow.nodes, edges: flow.edges };
      }),

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

    updateNodeData: (nodeId, data) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } as AnyNodeData }
            : node
        ),
      })),

    loadTemplate: (algorithm, modelPath = DEFAULT_MODEL) => {
      const flow = buildTemplate(algorithm, modelPath);
      set({ algorithm, nodes: flow.nodes, edges: flow.edges, selectedNodeId: null });
    },

    resetFlow: () => {
      const flow = buildTemplate(DEFAULT_ALGORITHM, DEFAULT_MODEL);
      set({
        algorithm: DEFAULT_ALGORITHM,
        nodes: flow.nodes,
        edges: flow.edges,
        selectedNodeId: null,
      });
    },
  }))
);
