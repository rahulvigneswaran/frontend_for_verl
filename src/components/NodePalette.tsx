import type { DragEvent } from "react";

interface PaletteItem {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: "model", label: "Model", icon: "🧠", color: "#6366f1", description: "Base LLM" },
  { type: "dataset", label: "Dataset", icon: "📊", color: "#10b981", description: "Training data" },
  { type: "actor", label: "Actor", icon: "🎭", color: "#f59e0b", description: "Actor policy" },
  { type: "rollout", label: "Rollout", icon: "⚡", color: "#3b82f6", description: "Inference engine" },
  { type: "critic", label: "Critic", icon: "🔍", color: "#8b5cf6", description: "Value function (PPO)" },
  { type: "rewardModel", label: "Reward Model", icon: "🏆", color: "#ec4899", description: "RM scoring" },
  { type: "customReward", label: "Custom Reward", icon: "⚙️", color: "#f43f5e", description: "Python reward fn" },
  { type: "agent", label: "Agent", icon: "🤖", color: "#a855f7", description: "LangGraph agent" },
  { type: "algorithm", label: "Algorithm", icon: "📐", color: "#ef4444", description: "RL algorithm" },
  { type: "trainer", label: "Trainer", icon: "🚂", color: "#14b8a6", description: "Training loop" },
  { type: "logger", label: "Logger", icon: "📈", color: "#f97316", description: "W&B / TensorBoard" },
  { type: "ray", label: "Ray Cluster", icon: "☁️", color: "#06b6d4", description: "Ray config" },
  { type: "ssh", label: "SSH Remote", icon: "🔗", color: "#84cc16", description: "Remote machine" },
];

export function NodePalette() {
  const onDragStart = (event: DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="p-2">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Nodes
      </div>
      <div className="space-y-1">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-grab hover:bg-secondary transition-colors group"
          >
            <span
              className="w-6 h-6 rounded flex items-center justify-center text-sm shrink-0"
              style={{ background: `${item.color}20` }}
            >
              {item.icon}
            </span>
            <div className="min-w-0">
              <div className="text-xs font-medium text-foreground">{item.label}</div>
              <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
