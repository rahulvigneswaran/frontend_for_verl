import { useEffect } from "react";
import { NodeInspector } from "./NodeInspector";
import { NODE_COLORS } from "../nodes/BaseNode";
import { useFlowStore } from "../store/flowStore";
import type { AnyNodeData } from "../lib/types";

interface NodeEditModalProps {
  nodeId: string;
  onClose: () => void;
}

export function NodeEditModal({ nodeId, onClose }: NodeEditModalProps) {
  const node = useFlowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const data = node?.data as AnyNodeData | undefined;
  const color = data ? NODE_COLORS[data.nodeType] : "#6b7280";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!node || !data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative bg-card rounded-xl shadow-2xl w-[480px] max-h-[85vh] flex flex-col overflow-hidden"
        style={{ borderTop: `3px solid ${color}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{data.label}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: `${color}30`, color }}
            >
              {data.nodeType}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-sm"
          >
            ✕
          </button>
        </div>

        {/* Inspector content */}
        <div className="flex-1 overflow-y-auto">
          <NodeInspector nodeId={nodeId} />
        </div>
      </div>
    </div>
  );
}
