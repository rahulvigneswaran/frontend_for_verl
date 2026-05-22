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
  launchRemoteJob,
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
  const { pythonCmd, workingDir, sshProfiles, activeSshProfileId, setActiveSshProfile } = useConnectionStore();
  const [launching, setLaunching] = useState(false);
  const [exportStatus, setExportStatus] = useState<"idle" | "ok" | "err">("idle");
  const [showSshMenu, setShowSshMenu] = useState(false);

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

  const getExperimentName = () => {
    const trainerNode = nodes.find((n) => (n.data as AnyNodeData).nodeType === "trainer");
    const trainerData = trainerNode?.data as { config?: { experiment_name?: string } } | undefined;
    return trainerData?.config?.experiment_name;
  };

  const buildAndSaveConfig = async (dir: string): Promise<{ configPath: string; expName?: string }> => {
    const config = flowNodesToVerlConfig(nodes as Node<AnyNodeData>[], algorithm);
    const errors = await validateConfig(config);
    const hardErrors = errors.filter((e) => e.severity === "error");
    if (hardErrors.length > 0) {
      throw new Error(`Validation errors:\n${hardErrors.map((e) => `• ${e.field}: ${e.message}`).join("\n")}`);
    }
    const configFile = `${algorithm}_trainer.yaml`;
    const configPath = `${dir}/${configFile}`;
    await saveYaml(config, configPath);
    return { configPath, expName: getExperimentName() };
  };

  const handleRunLocally = async () => {
    setLaunching(true);
    try {
      const effectiveDir = workingDir.replace(/^~/, (globalThis as Record<string, unknown>).HOME as string ?? "~");
      const { configPath, expName } = await buildAndSaveConfig(effectiveDir);

      const jobId = await launchLocalJob({
        configPath,
        workingDir: effectiveDir,
        pythonCmd,
        experimentName: expName,
      });

      addJob({
        id: jobId,
        name: expName ?? `job-${jobId.slice(0, 8)}`,
        status: "pending",
        created_at: new Date().toISOString(),
        working_dir: effectiveDir,
        config_path: configPath,
        is_remote: false,
      });
      setActiveJobId(jobId);
    } catch (e) {
      console.error("Launch failed", e);
      alert(String(e));
    } finally {
      setLaunching(false);
    }
  };

  const handleRunOnSsh = async (profileId: string) => {
    setShowSshMenu(false);
    const profile = sshProfiles.find((p) => p.id === profileId);
    if (!profile) return;
    setActiveSshProfile(profileId);
    setLaunching(true);
    try {
      const config = flowNodesToVerlConfig(nodes as Node<AnyNodeData>[], algorithm);
      const configYaml = await serializeYaml(config);
      const expName = getExperimentName();
      const configName = `${algorithm}_trainer.yaml`;

      const jobId = await launchRemoteJob({
        host: profile.host,
        port: profile.port,
        username: profile.username,
        auth: profile.authType === "key"
          ? { type: "key", key_path: profile.keyPath ?? "" }
          : profile.authType === "password"
          ? { type: "password", password: "" }
          : { type: "agent" },
        remoteWorkDir: profile.remoteWorkDir,
        pythonCmd: profile.pythonCmd,
        configYaml,
        configName,
        experimentName: expName,
      });

      addJob({
        id: jobId,
        name: expName ?? `job-${jobId.slice(0, 8)}`,
        status: "pending",
        created_at: new Date().toISOString(),
        working_dir: profile.remoteWorkDir,
        config_path: `${profile.remoteWorkDir}/${configName}`,
        is_remote: true,
        remote_host: profile.host,
      });
      setActiveJobId(jobId);
    } catch (e) {
      console.error("Remote launch failed", e);
      alert(String(e));
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

      {/* SSH run dropdown */}
      {sshProfiles.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowSshMenu((v) => !v)}
            disabled={launching}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-secondary text-muted-foreground hover:text-foreground hover:border-border/60 transition-colors disabled:opacity-50"
          >
            🔗 SSH
            <span className="text-[10px] opacity-60">▾</span>
          </button>
          {showSshMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
              {sshProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleRunOnSsh(p.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary transition-colors text-left",
                    activeSshProfileId === p.id && "text-primary"
                  )}
                >
                  <span>🔗</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name || p.host}</div>
                    <div className="text-[10px] text-muted-foreground">{p.username}@{p.host}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Run Locally button */}
      <button
        onClick={handleRunLocally}
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
