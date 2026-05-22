import { useState } from "react";
import { NodeInspector } from "../panels/NodeInspector";
import { JobPanel } from "../panels/JobPanel";
import { DashboardPanel } from "../panels/DashboardPanel";
import { cn } from "../lib/utils";

type Tab = "inspector" | "jobs" | "dashboard";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "inspector", label: "Inspector", icon: "◎" },
  { id: "jobs", label: "Jobs", icon: "⬡" },
  { id: "dashboard", label: "Metrics", icon: "⬡" },
];

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("inspector");

  return (
    <div className="flex flex-col h-full w-72 shrink-0 border-l border-border bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2 text-xs font-medium transition-colors",
              tab === t.id
                ? "text-foreground border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "inspector" && <NodeInspector />}
        {tab === "jobs" && <JobPanel />}
        {tab === "dashboard" && <DashboardPanel />}
      </div>
    </div>
  );
}
