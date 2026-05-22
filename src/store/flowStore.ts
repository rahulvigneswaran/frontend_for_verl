import {
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
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
import { EDGE_DEFAULTS } from "../lib/edgeDefaults";
import { edgeColorFromHandle, portTypeFromHandle } from "../lib/portTypes";

export { EDGE_DEFAULTS };

export function isValidConnection(connection: Connection | Edge): boolean {
  const src = "sourceHandle" in connection ? connection.sourceHandle : null;
  const tgt = "targetHandle" in connection ? connection.targetHandle : null;
  if (!src || !tgt) return false;
  const srcType = portTypeFromHandle(src);
  const tgtType = portTypeFromHandle(tgt);
  return srcType !== null && tgtType !== null && srcType === tgtType;
}

interface FlowState {
  nodes: Node<AnyNodeData>[];
  edges: Edge[];
  algorithm: Algorithm;
  selectedNodeId: string | null;

  setNodes: (nodes: Node<AnyNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node<AnyNodeData>) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setAlgorithm: (algorithm: Algorithm) => void;
  setSelectedNodeId: (id: string | null) => void;
  updateNodeData: (nodeId: string, data: Partial<AnyNodeData>) => void;
  deleteNode: (nodeId: string) => void;
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

    addNode: (node) =>
      set((state) => ({ nodes: [...state.nodes, node] })),

    onNodesChange: (changes) =>
      set((state) => ({
        nodes: applyNodeChanges(changes, state.nodes) as Node<AnyNodeData>[],
      })),

    onEdgesChange: (changes) =>
      set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

    onConnect: (connection) =>
      set((state) => {
        const color = edgeColorFromHandle(connection.sourceHandle);
        const edgeStyle: Partial<Edge> = {
          animated: true,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color },
          style: { stroke: color, strokeWidth: 2 },
        };
        return { edges: addEdge({ ...connection, ...edgeStyle }, state.edges) };
      }),

    setAlgorithm: (algorithm) =>
      set((state) => {
        const modelNode = state.nodes.find((n) => n.data.nodeType === "model");
        const modelPath = (modelNode?.data as { config?: { path?: string } })?.config?.path ?? DEFAULT_MODEL;
        const flow = buildTemplate(algorithm, modelPath);
        return { algorithm, nodes: flow.nodes, edges: flow.edges };
      }),

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),

    updateNodeData: (nodeId, data) =>
      set((state) => ({
        nodes: state.nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...data } as AnyNodeData } : node
        ),
      })),

    deleteNode: (nodeId) =>
      set((state) => ({
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
        selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      })),

    loadTemplate: (algorithm, modelPath = DEFAULT_MODEL) => {
      const flow = buildTemplate(algorithm, modelPath);
      set({ algorithm, nodes: flow.nodes, edges: flow.edges, selectedNodeId: null });
    },

    resetFlow: () => {
      const flow = buildTemplate(DEFAULT_ALGORITHM, DEFAULT_MODEL);
      set({ algorithm: DEFAULT_ALGORITHM, nodes: flow.nodes, edges: flow.edges, selectedNodeId: null });
    },
  }))
);
