import { useState } from "react";
import { NodePalette } from "./NodePalette";
import { TemplateLibrary } from "./TemplateLibrary";
import { cn } from "../lib/utils";
import type { NodeType } from "../lib/types";

type Tab = "nodes" | "templates";

interface SidebarProps {
  onAddNode?: (type: NodeType) => void;
}

export function Sidebar({ onAddNode }: SidebarProps) {
  const [tab, setTab] = useState<Tab>("templates");

  return (
    <div className="flex flex-col h-full w-full border-r border-border bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(["templates", "nodes"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors capitalize",
              tab === t
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "nodes" && <NodePalette onAddNode={onAddNode} />}
        {tab === "templates" && <TemplateLibrary />}
      </div>
    </div>
  );
}
