import { useState } from "react";
import { useConnectionStore, type SshProfile } from "../store/connectionStore";
import { cn } from "../lib/utils";

type SettingsTab = "general" | "wandb" | "hf" | "ssh";

const TABS: { id: SettingsTab; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "⚙" },
  { id: "wandb", label: "W&B", icon: "📊" },
  { id: "hf", label: "HuggingFace", icon: "🤗" },
  { id: "ssh", label: "SSH", icon: "🔗" },
];

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-secondary border border-border rounded px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function GeneralSettings() {
  const { pythonCmd, workingDir, setPythonCmd, setWorkingDir } = useConnectionStore();
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-3">Environment</h3>
        <div className="space-y-3">
          <InputField
            label="Python command"
            value={pythonCmd}
            onChange={setPythonCmd}
            placeholder="python3"
            hint="Command used to launch verl training jobs locally"
          />
          <InputField
            label="Default working directory"
            value={workingDir}
            onChange={setWorkingDir}
            placeholder="~/verl_runs"
            hint="Where YAML configs and checkpoints are saved by default"
          />
        </div>
      </div>
    </div>
  );
}

function WandbSettings() {
  const { wandb, setWandb } = useConnectionStore();
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-1">Weights & Biases</h3>
        <p className="text-[10px] text-muted-foreground mb-3">
          Configure W&B for experiment tracking and metrics dashboard.
        </p>
        <div className="space-y-3">
          <InputField
            label="API Key"
            value={wandb.apiKey}
            onChange={(v) => setWandb({ apiKey: v })}
            type="password"
            placeholder="wandb api key…"
            hint="Found at wandb.ai/settings"
          />
          <InputField
            label="Entity"
            value={wandb.entity}
            onChange={(v) => setWandb({ entity: v })}
            placeholder="your-username or team-name"
          />
          <InputField
            label="Default project"
            value={wandb.defaultProject}
            onChange={(v) => setWandb({ defaultProject: v })}
            placeholder="verl_experiments"
          />
        </div>
      </div>
    </div>
  );
}

function HuggingFaceSettings() {
  const { hfToken, setHfToken } = useConnectionStore();
  return (
    <div className="space-y-4 p-4">
      <div>
        <h3 className="text-xs font-semibold text-foreground mb-1">HuggingFace</h3>
        <p className="text-[10px] text-muted-foreground mb-3">
          Required to search gated models and fetch model metadata.
        </p>
        <div className="space-y-3">
          <InputField
            label="Access Token"
            value={hfToken}
            onChange={setHfToken}
            type="password"
            placeholder="hf_…"
            hint="Generate at huggingface.co/settings/tokens"
          />
        </div>
      </div>
    </div>
  );
}

const EMPTY_PROFILE: Omit<SshProfile, "id"> = {
  name: "",
  host: "",
  port: 22,
  username: "",
  authType: "key",
  keyPath: "",
  remoteWorkDir: "~/verl_runs",
  pythonCmd: "python3",
};

function SshSettings() {
  const { sshProfiles, activeSshProfileId, addSshProfile, removeSshProfile, updateSshProfile, setActiveSshProfile } = useConnectionStore();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Omit<SshProfile, "id">>(EMPTY_PROFILE);

  const openNew = () => {
    setDraft(EMPTY_PROFILE);
    setEditing("new");
  };

  const openEdit = (p: SshProfile) => {
    setDraft({ name: p.name, host: p.host, port: p.port, username: p.username, authType: p.authType, keyPath: p.keyPath ?? "", remoteWorkDir: p.remoteWorkDir, pythonCmd: p.pythonCmd });
    setEditing(p.id);
  };

  const save = () => {
    if (!draft.host || !draft.username) return;
    if (editing === "new") {
      addSshProfile({ ...draft, id: `ssh-${Date.now()}` });
    } else if (editing) {
      updateSshProfile(editing, draft);
    }
    setEditing(null);
  };

  if (editing !== null) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-semibold text-foreground">
            {editing === "new" ? "New SSH Profile" : "Edit SSH Profile"}
          </h3>
          <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
        <InputField label="Profile name" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="My GPU Server" />
        <InputField label="Host" value={draft.host} onChange={(v) => setDraft((d) => ({ ...d, host: v }))} placeholder="192.168.1.100" />
        <div className="grid grid-cols-2 gap-2">
          <InputField label="Port" value={String(draft.port)} onChange={(v) => setDraft((d) => ({ ...d, port: Number(v) || 22 }))} placeholder="22" />
          <InputField label="Username" value={draft.username} onChange={(v) => setDraft((d) => ({ ...d, username: v }))} placeholder="ubuntu" />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Auth type</label>
          <div className="flex gap-2">
            {(["key", "password", "agent"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDraft((d) => ({ ...d, authType: t }))}
                className={cn(
                  "px-2.5 py-1 rounded text-xs transition-colors",
                  draft.authType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {draft.authType === "key" && (
          <InputField label="Key path" value={draft.keyPath ?? ""} onChange={(v) => setDraft((d) => ({ ...d, keyPath: v }))} placeholder="~/.ssh/id_rsa" />
        )}

        <InputField label="Remote work dir" value={draft.remoteWorkDir} onChange={(v) => setDraft((d) => ({ ...d, remoteWorkDir: v }))} placeholder="~/verl_runs" />
        <InputField label="Python command" value={draft.pythonCmd} onChange={(v) => setDraft((d) => ({ ...d, pythonCmd: v }))} placeholder="python3" />

        <button
          onClick={save}
          disabled={!draft.host || !draft.username}
          className="w-full py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          Save Profile
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">SSH Profiles</h3>
        <button
          onClick={openNew}
          className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          + Add
        </button>
      </div>

      {sshProfiles.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No SSH profiles yet. Add one to run jobs on remote machines.</p>
      ) : (
        <div className="space-y-2">
          {sshProfiles.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border transition-colors cursor-pointer",
                activeSshProfileId === p.id ? "border-primary bg-primary/10" : "border-border hover:border-border/80 hover:bg-secondary/50"
              )}
              onClick={() => setActiveSshProfile(activeSshProfileId === p.id ? null : p.id)}
            >
              <span className="text-base">🔗</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-foreground truncate">{p.name || p.host}</div>
                <div className="text-[10px] text-muted-foreground">{p.username}@{p.host}:{p.port}</div>
              </div>
              {activeSshProfileId === p.id && (
                <span className="text-[10px] text-primary font-medium shrink-0">active</span>
              )}
              <div className="flex gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-white/10 text-xs"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSshProfile(p.id); }}
                  className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-red-400 hover:bg-red-500/10 text-xs"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsPanel() {
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs */}
      <div className="flex border-b border-border shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 py-2 text-[10px] font-medium transition-colors",
              tab === t.id ? "text-foreground border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "general" && <GeneralSettings />}
        {tab === "wandb" && <WandbSettings />}
        {tab === "hf" && <HuggingFaceSettings />}
        {tab === "ssh" && <SshSettings />}
      </div>
    </div>
  );
}
