import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "../lib/utils";
import type { AnyNodeData, NodeType } from "../lib/types";

const NODE_COLORS: Record<NodeType, string> = {
  model: "#6366f1",
  dataset: "#10b981",
  actor: "#f59e0b",
  rollout: "#3b82f6",
  critic: "#8b5cf6",
  rewardModel: "#ec4899",
  customReward: "#f43f5e",
  algorithm: "#ef4444",
  trainer: "#14b8a6",
  logger: "#f97316",
  ray: "#06b6d4",
  ssh: "#84cc16",
};

const NODE_ICONS: Record<NodeType, string> = {
  model: "🧠",
  dataset: "📊",
  actor: "🎭",
  rollout: "⚡",
  critic: "🔍",
  rewardModel: "🏆",
  customReward: "⚙️",
  algorithm: "📐",
  trainer: "🚂",
  logger: "📈",
  ray: "☁️",
  ssh: "🔗",
};

interface BaseNodeProps extends NodeProps {
  data: AnyNodeData;
  children?: React.ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  extraHandles?: React.ReactNode;
}

export function BaseNode({
  data,
  selected,
  children,
  hasInput = true,
  hasOutput = true,
  extraHandles,
}: BaseNodeProps) {
  const color = NODE_COLORS[data.nodeType] ?? "#6b7280";
  const icon = NODE_ICONS[data.nodeType] ?? "◉";

  return (
    <div
      className={cn(
        "verl-node",
        selected && "selected"
      )}
      style={{ borderTop: `3px solid ${color}` }}
    >
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: color, width: 10, height: 10 }}
        />
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg"
        style={{ background: `${color}18` }}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="text-sm font-semibold text-foreground truncate">
          {data.label}
        </span>
        <span
          className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium"
          style={{ background: `${color}30`, color }}
        >
          {data.nodeType}
        </span>
      </div>

      {/* Content */}
      <div className="px-3 py-2 text-xs text-muted-foreground space-y-1">
        {children}
      </div>

      {extraHandles}

      {hasOutput && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: color, width: 10, height: 10 }}
        />
      )}
    </div>
  );
}

interface FieldRowProps {
  label: string;
  value: React.ReactNode;
}

export function FieldRow({ label, value }: FieldRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right font-mono truncate max-w-[120px]">
        {String(value ?? "—")}
      </span>
    </div>
  );
}
