import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "../lib/utils";
import type { AnyNodeData, NodeType } from "../lib/types";
import { useFlowStore } from "../store/flowStore";
import {
  NODE_INPUT_PORTS,
  NODE_OUTPUT_PORTS,
  PORT_COLORS,
  type PortDef,
} from "../lib/portTypes";

export const NODE_COLORS: Record<NodeType, string> = {
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

const NODE_ICONS: Record<NodeType, string> = {
  model: "🧠",
  dataset: "📊",
  actor: "🎭",
  rollout: "⚡",
  critic: "🔍",
  rewardModel: "🏆",
  customReward: "⚙️",
  agent: "🤖",
  algorithm: "📐",
  trainer: "🚂",
  logger: "📈",
  ray: "☁️",
  ssh: "🔗",
};

// Fixed layout constants for deterministic handle positioning
const HEADER_H = 43; // px: border-top 3px + py-2(8) + text-line(16) + py-2(8) + border(1) ≈ 43
const PORT_ROW_H = 22; // px per port row

interface BaseNodeProps extends NodeProps {
  data: AnyNodeData;
  children?: React.ReactNode;
}

function PortHandle({
  port,
  kind,
  index,
}: {
  port: PortDef;
  kind: "input" | "output";
  index: number;
}) {
  const topPx = HEADER_H + index * PORT_ROW_H + PORT_ROW_H / 2;
  const color = PORT_COLORS[port.type];

  return (
    <Handle
      id={port.id}
      type={kind === "input" ? "target" : "source"}
      position={kind === "input" ? Position.Left : Position.Right}
      style={{
        top: topPx,
        background: color,
        width: 10,
        height: 10,
        border: "2px solid hsl(222 47% 9%)",
        borderRadius: "50%",
      }}
    />
  );
}

export function BaseNode({ data, selected, id, children }: BaseNodeProps) {
  const color = NODE_COLORS[data.nodeType] ?? "#6b7280";
  const icon = NODE_ICONS[data.nodeType] ?? "◉";
  const { deleteNode, setSelectedNodeId } = useFlowStore();

  const inputPorts = NODE_INPUT_PORTS[data.nodeType] ?? [];
  const outputPorts = NODE_OUTPUT_PORTS[data.nodeType] ?? [];
  const maxPorts = Math.max(inputPorts.length, outputPorts.length);
  const portSectionH = maxPorts * PORT_ROW_H;

  return (
    <div
      className={cn("verl-node group", selected && "selected")}
      style={{ borderTop: `3px solid ${color}` }}
    >
      {/* Typed input handles */}
      {inputPorts.map((port, i) => (
        <PortHandle key={port.id} port={port} kind="input" index={i} />
      ))}

      {/* Typed output handles */}
      {outputPorts.map((port, i) => (
        <PortHandle key={port.id} port={port} kind="output" index={i} />
      ))}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-t-lg" style={{ background: `${color}18` }}>
        <span className="text-base leading-none">{icon}</span>
        <span className="text-sm font-semibold text-foreground truncate">{data.label}</span>
        <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}30`, color }}>
          {data.nodeType}
        </span>

        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          <button
            title="Edit (or double-click)"
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-white/10 text-xs"
            onClick={(e) => { e.stopPropagation(); setSelectedNodeId(id); }}
          >
            ✎
          </button>
          <button
            title="Delete node"
            className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 text-xs"
            onClick={(e) => { e.stopPropagation(); deleteNode(id); }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Port labels section */}
      {maxPorts > 0 && (
        <div className="relative border-b border-border/40" style={{ height: portSectionH }}>
          {inputPorts.map((port, i) => (
            <div
              key={port.id}
              className="absolute left-3 flex items-center gap-1.5"
              style={{
                top: i * PORT_ROW_H,
                height: PORT_ROW_H,
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: PORT_COLORS[port.type] }}
              />
              <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: PORT_COLORS[port.type] }}>
                {port.label}
              </span>
            </div>
          ))}
          {outputPorts.map((port, i) => (
            <div
              key={port.id}
              className="absolute right-3 flex items-center gap-1.5"
              style={{
                top: i * PORT_ROW_H,
                height: PORT_ROW_H,
              }}
            >
              <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: PORT_COLORS[port.type] }}>
                {port.label}
              </span>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: PORT_COLORS[port.type] }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {children && (
        <div className="px-3 py-2 text-xs text-muted-foreground space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

export function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right font-mono truncate max-w-[130px]">{String(value ?? "—")}</span>
    </div>
  );
}
