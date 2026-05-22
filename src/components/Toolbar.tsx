import { useState } from "react";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useFlowStore } from "../store/flowStore";
import { useJobStore } from "../store/jobStore";
import { useConnectionStore } from "../store/connectionStore";
import { flowNodesToVerlConfig } from "../lib/configConverter";
import {
  parseYaml,
  saveYaml,
  serializeYaml,
  validateConfig,
  launchLocalJob,
} from "../lib/tauri";
import { verlConfigToFlowNodes } from "../lib/configConverter";
import type { AnyNodeData } from "../lib/types";
import type { Node } from "@xyflow/react";
import { cn } from "../lib/utils";

const ALGO_OPTIONS = [
  { id: "ppo", label: "PPO" },
  { id: "grpo", label: "GRPO" },
  { id: "dapo", label: "DAPO" },
  { id: "rloo", label: "RLOO" },
  { id: "reinforce_pp", label: "RF++" },
] as const;

export function Toolbar() {
  const { nodes, algorithm, setAlgorithm, setNodes, setEdges, resetFlow } = useFlowStore();
  const { addJob, setActiveJobId } = useJobStore();
  const { pythonCmd } = useConnectionStore();
  const [launching, setLaunching] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "ok" | "err">("idle");

  const handleOpen = async () => {
    const path = await open({
      filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
    });
    if (!path) return;
    try {
      const config = await parseYaml(path as string);
      const importedNodes = verlConfigToFlowNodes(config, algorithm);
      setNodes(importedNodes as Node<AnyNodeData>[]);
      setEdges([]);
    } catch (e) {
      console.error("Failed to import YAML", e);
    }
  };

  const handleExport = async () => {
    const path = await save({
      filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
      defaultPath: `${algorithm}_trainer.yaml`,
    });
    if (!path) return;

    const config = flowNodesToVerlConfig(nodes as Node<AnyNodeData>[], algorithm);
    const errors = await validateConfig(config);
    const hardErrors = errors.filter((e) => e.severity === "error");

    if (hardErrors.length > 0) {
      alert(`Validation errors:\n${hardErrors.map((e) => `• ${e.field}: ${e.message}`).join("\n")}`);
      setExportStatus("err");
      setTimeout(() => setExportStatus("idle"), 2000);
      return;
    }

    await saveYaml(config, path);
    setExportStatus("ok");
    setTimeout(() => setExportStatus("idle"), 2000);
  };

  const handleCopyYaml = async () => {
    const config = flowNodesToVerlConfig(nodes as Node<AnyNodeData>[], algorithm);
    const yaml = await serializeYaml(config);
    await navigator.clipboard.writeText(yaml);
  };

  const handleRun = async () => {
    setLaunching(true);
    try {
      const config = flowNodesToVerlConfig(nodes as Node<AnyNodeData>[], algorithm);

      const savePath = await save({
        filters: [{ name: "YAML", extensions: ["yaml", "yml"] }],
        defaultPath: `${algorithm}_trainer.yaml`,
      });
      if (!savePath) return;

      await saveYaml(config, savePath);

      const trainerNode = nodes.find((n) => (n.data as AnyNodeData).nodeType === "trainer");
      const trainerData = trainerNode?.data as { config?: { experiment_name?: string } } | undefined;
      const expName = trainerData?.config?.experiment_name;

      const workDir = (savePath as string).split("/").slice(0, -1).join("/");
      const configFile = (savePath as string).split("/").pop()!;

      const jobId = await launchLocalJob({
        configPath: configFile,
        workingDir: workDir,
        pythonCmd,
        experimentName: expName,
      });

      addJob({
        id: jobId,
        name: expName ?? `job-${jobId.slice(0, 8)}`,
        status: "pending",
        created_at: new Date().toISOString(),
        working_dir: workDir,
        config_path: savePath as string,
        is_remote: false,
      });
      setActiveJobId(jobId);
    } catch (e) {
      console.error("Launch failed", e);
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-card h-12 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <span className="text-lg">⚡</span>
        <span className="font-bold text-sm text-foreground">VeRL Studio</span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Algorithm picker */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
        {ALGO_OPTIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAlgorithm(a.id)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              algorithm === a.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-border" />

      {/* File ops */}
      <button
        onClick={resetFlow}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
      >
        New
      </button>
      <button
        onClick={handleOpen}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
      >
        Open YAML
      </button>
      <button
        onClick={handleExport}
        className={cn(
          "text-xs transition-colors px-2 py-1 rounded",
          exportStatus === "ok"
            ? "text-green-400"
            : exportStatus === "err"
            ? "text-red-400"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        )}
      >
        {exportStatus === "ok" ? "✓ Saved" : exportStatus === "err" ? "✗ Error" : "Export YAML"}
      </button>
      <button
        onClick={handleCopyYaml}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary"
      >
        Copy YAML
      </button>

      <div className="flex-1" />

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={launching}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
          launching
            ? "bg-primary/50 text-primary-foreground cursor-not-allowed"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {launching ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Launching…
          </>
        ) : (
          <>▶ Run Locally</>
        )}
      </button>
    </div>
  );
}
