import { useState } from "react";
import { NodeInspector } from "../panels/NodeInspector";
import { JobPanel } from "../panels/JobPanel";
import { DashboardPanel } from "../panels/DashboardPanel";
import { SettingsPanel } from "./SettingsPanel";
import { cn } from "../lib/utils";

type Tab = "inspector" | "jobs" | "dashboard" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "inspector", label: "Inspector" },
  { id: "jobs", label: "Jobs" },
  { id: "dashboard", label: "Metrics" },
  { id: "settings", label: "Settings" },
];

export function RightPanel() {
  const [tab, setTab] = useState<Tab>("inspector");

  return (
    <div className="flex flex-col h-full w-full border-l border-border bg-card">
      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2 text-[10px] font-medium transition-colors",
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
        {tab === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}
