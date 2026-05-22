import { MarkerType, type Edge } from "@xyflow/react";

export const EDGE_DEFAULTS: Partial<Edge> = {
  animated: true,
  type: "smoothstep",
  markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#64748b" },
  style: { stroke: "#64748b", strokeWidth: 2 },
};
