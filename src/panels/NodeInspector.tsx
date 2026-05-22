import { useFlowStore } from "../store/flowStore";
import type {
  AnyNodeData,
  ModelNodeData,
  DatasetNodeData,
  ActorNodeData,
  RolloutNodeData,
  CriticNodeData,
  AlgorithmNodeData,
  TrainerNodeData,
  LoggerNodeData,
  RayNodeData,
  SshNodeData,
} from "../lib/types";

function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  step,
  options,
}: {
  label: string;
  value: string | number | boolean | undefined;
  onChange: (v: string | number | boolean) => void;
  type?: "text" | "number" | "boolean" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}) {
  const inputClass =
    "w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono";

  if (type === "boolean") {
    return (
      <div className="flex items-center justify-between gap-2 py-0.5">
        <label className="text-xs text-muted-foreground">{label}</label>
        <button
          onClick={() => onChange(!value)}
          className={`relative w-8 h-4 rounded-full transition-colors ${value ? "bg-primary" : "bg-secondary border border-border"}`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-foreground transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`}
          />
        </button>
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <div className="flex flex-col gap-0.5 py-0.5">
        <label className="text-xs text-muted-foreground">{label}</label>
        <select
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0.5 py-0.5">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type={type}
        value={String(value ?? "")}
        min={min}
        max={max}
        step={step}
        onChange={(e) =>
          onChange(type === "number" ? Number(e.target.value) : e.target.value)
        }
        className={inputClass}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ModelInspector({ data, update }: { data: ModelNodeData; update: (d: Partial<ModelNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, [k]: v } });
  return (
    <>
      <Section title="Model">
        <Field label="Model path / HF ID" value={c.path} onChange={(v) => u("path", v)} />
        <Field
          label="dtype"
          value={c.dtype}
          onChange={(v) => u("dtype", v)}
          type="select"
          options={[
            { value: "bfloat16", label: "bfloat16" },
            { value: "float16", label: "float16" },
            { value: "float32", label: "float32" },
          ]}
        />
        <Field label="Fused kernels" value={c.use_fused_kernels} onChange={(v) => u("use_fused_kernels", v)} type="boolean" />
        <Field label="Gradient checkpointing" value={c.enable_gradient_checkpointing} onChange={(v) => u("enable_gradient_checkpointing", v)} type="boolean" />
      </Section>
    </>
  );
}

function DatasetInspector({ data, update }: { data: DatasetNodeData; update: (d: Partial<DatasetNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, [k]: v } });
  return (
    <>
      <Section title="Data">
        <Field label="Train batch size" value={c.train_batch_size} onChange={(v) => u("train_batch_size", v)} type="number" min={1} />
        <Field label="Val batch size" value={c.val_batch_size} onChange={(v) => u("val_batch_size", v)} type="number" min={1} />
        <Field label="Max prompt length" value={c.max_prompt_length} onChange={(v) => u("max_prompt_length", v)} type="number" min={1} />
        <Field label="Max response length" value={c.max_response_length} onChange={(v) => u("max_response_length", v)} type="number" min={1} />
        <Field label="Prompt key" value={c.prompt_key} onChange={(v) => u("prompt_key", v)} />
        <Field label="Response key" value={c.response_key} onChange={(v) => u("response_key", v)} />
      </Section>
      <Section title="Files">
        <Field label="Train files (comma-sep)" value={c.train_files?.join(", ")} onChange={(v) => u("train_files", String(v).split(",").map((s) => s.trim()))} />
        <Field label="Val files (comma-sep)" value={c.val_files?.join(", ")} onChange={(v) => u("val_files", String(v).split(",").map((s) => s.trim()))} />
      </Section>
    </>
  );
}

function ActorInspector({ data, update }: { data: ActorNodeData; update: (d: Partial<ActorNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, [k]: v } });
  return (
    <>
      <Section title="Training">
        <Field label="Strategy" value={c.strategy} onChange={(v) => u("strategy", v)} type="select" options={[{ value: "fsdp", label: "FSDP" }, { value: "fsdp2", label: "FSDP2" }, { value: "megatron", label: "Megatron-LM" }]} />
        <Field label="Learning rate" value={c.lr} onChange={(v) => u("lr", v)} type="number" step={1e-7} />
        <Field label="LR warmup steps" value={c.lr_warmup_steps} onChange={(v) => u("lr_warmup_steps", v)} type="number" />
        <Field label="PPO mini batch size" value={c.ppo_mini_batch_size} onChange={(v) => u("ppo_mini_batch_size", v)} type="number" min={1} />
        <Field label="Micro batch size/GPU" value={c.ppo_micro_batch_size_per_gpu} onChange={(v) => u("ppo_micro_batch_size_per_gpu", v)} type="number" min={1} />
        <Field label="PPO epochs" value={c.ppo_epochs} onChange={(v) => u("ppo_epochs", v)} type="number" min={1} />
      </Section>
      <Section title="PPO / KL">
        <Field label="Clip ratio" value={c.clip_ratio} onChange={(v) => u("clip_ratio", v)} type="number" step={0.01} />
        <Field label="Entropy coeff" value={c.entropy_coeff} onChange={(v) => u("entropy_coeff", v)} type="number" step={0.001} />
        <Field label="Use KL loss" value={c.use_kl_loss} onChange={(v) => u("use_kl_loss", v)} type="boolean" />
        <Field label="KL loss coeff" value={c.kl_loss_coef} onChange={(v) => u("kl_loss_coef", v)} type="number" step={0.001} />
      </Section>
    </>
  );
}

function RolloutInspector({ data, update }: { data: RolloutNodeData; update: (d: Partial<RolloutNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, [k]: v } });
  return (
    <>
      <Section title="Engine">
        <Field label="Engine" value={c.name} onChange={(v) => u("name", v)} type="select" options={[{ value: "vllm", label: "vLLM" }, { value: "sglang", label: "SGLang" }, { value: "hf", label: "HuggingFace" }]} />
        <Field label="Tensor model parallel" value={c.tensor_model_parallel_size} onChange={(v) => u("tensor_model_parallel_size", v)} type="number" min={1} />
        <Field label="GPU memory util" value={c.gpu_memory_utilization} onChange={(v) => u("gpu_memory_utilization", v)} type="number" min={0.1} max={1.0} step={0.05} />
      </Section>
      <Section title="Sampling">
        <Field label="n (samples/prompt)" value={c.n} onChange={(v) => u("n", v)} type="number" min={1} />
        <Field label="Temperature" value={c.temperature} onChange={(v) => u("temperature", v)} type="number" step={0.1} />
        <Field label="Top-p" value={c.top_p} onChange={(v) => u("top_p", v)} type="number" step={0.05} />
        <Field label="Top-k" value={c.top_k} onChange={(v) => u("top_k", v)} type="number" />
        <Field label="Max tokens" value={c.max_tokens} onChange={(v) => u("max_tokens", v)} type="number" min={1} />
      </Section>
    </>
  );
}

function CriticInspector({ data, update }: { data: CriticNodeData; update: (d: Partial<CriticNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, [k]: v } });
  return (
    <>
      <Section title="Critic">
        <Field label="Strategy" value={c.strategy} onChange={(v) => u("strategy", v)} type="select" options={[{ value: "fsdp", label: "FSDP" }, { value: "fsdp2", label: "FSDP2" }, { value: "megatron", label: "Megatron-LM" }]} />
        <Field label="Learning rate" value={c.lr} onChange={(v) => u("lr", v)} type="number" step={1e-6} />
        <Field label="PPO mini batch size" value={c.ppo_mini_batch_size} onChange={(v) => u("ppo_mini_batch_size", v)} type="number" min={1} />
        <Field label="Micro batch size/GPU" value={c.ppo_micro_batch_size_per_gpu} onChange={(v) => u("ppo_micro_batch_size_per_gpu", v)} type="number" min={1} />
        <Field label="PPO epochs" value={c.ppo_epochs} onChange={(v) => u("ppo_epochs", v)} type="number" min={1} />
        <Field label="Cliprange value" value={c.cliprange_value} onChange={(v) => u("cliprange_value", v)} type="number" step={0.05} />
      </Section>
    </>
  );
}

function AlgorithmInspector({ data, update }: { data: AlgorithmNodeData; update: (d: Partial<AlgorithmNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, [k]: v } });
  return (
    <>
      <Section title="Algorithm">
        <Field label="Advantage estimator" value={c.adv_estimator} onChange={(v) => u("adv_estimator", v)} type="select" options={[{ value: "gae", label: "GAE (PPO)" }, { value: "grpo", label: "GRPO" }, { value: "rloo", label: "RLOO" }, { value: "reinforce", label: "REINFORCE" }]} />
        <Field label="Gamma" value={c.gamma} onChange={(v) => u("gamma", v)} type="number" step={0.01} min={0} max={1} />
        <Field label="Lambda (GAE)" value={c.lam} onChange={(v) => u("lam", v)} type="number" step={0.01} min={0} max={1} />
        <Field label="Norm adv by std" value={c.norm_adv_by_std_in_grpo} onChange={(v) => u("norm_adv_by_std_in_grpo", v)} type="boolean" />
      </Section>
      <Section title="KL Penalty">
        <Field label="KL in reward" value={c.use_kl_in_reward} onChange={(v) => u("use_kl_in_reward", v)} type="boolean" />
        <Field label="KL penalty type" value={c.kl_penalty} onChange={(v) => u("kl_penalty", v)} type="select" options={[{ value: "kl", label: "kl" }, { value: "abs", label: "abs" }, { value: "mse", label: "mse" }, { value: "full", label: "full" }]} />
        <Field label="KL coeff" value={c.kl_ctrl?.kl_coef} onChange={(v) => u("kl_ctrl", { ...c.kl_ctrl, kl_coef: v })} type="number" step={0.001} />
        <Field label="Target KL" value={c.kl_ctrl?.target_kl} onChange={(v) => u("kl_ctrl", { ...c.kl_ctrl, target_kl: v })} type="number" step={0.01} />
      </Section>
    </>
  );
}

function TrainerInspector({ data, update }: { data: TrainerNodeData; update: (d: Partial<TrainerNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, [k]: v } });
  return (
    <>
      <Section title="Training Loop">
        <Field label="Total epochs" value={c.total_epochs} onChange={(v) => u("total_epochs", v)} type="number" min={1} />
        <Field label="Total steps (override)" value={c.total_training_steps} onChange={(v) => u("total_training_steps", v)} type="number" />
        <Field label="Val before train" value={c.val_before_train} onChange={(v) => u("val_before_train", v)} type="boolean" />
        <Field label="Test freq" value={c.test_freq} onChange={(v) => u("test_freq", v)} type="number" />
      </Section>
      <Section title="Hardware">
        <Field label="Nodes" value={c.nnodes} onChange={(v) => u("nnodes", v)} type="number" min={1} />
        <Field label="GPUs per node" value={c.n_gpus_per_node} onChange={(v) => u("n_gpus_per_node", v)} type="number" min={1} />
      </Section>
      <Section title="Checkpointing">
        <Field label="Save freq" value={c.save_freq} onChange={(v) => u("save_freq", v)} type="number" />
        <Field label="Max ckpts to keep" value={c.max_actor_ckpt_to_keep} onChange={(v) => u("max_actor_ckpt_to_keep", v)} type="number" />
        <Field label="Local dir" value={c.default_local_dir} onChange={(v) => u("default_local_dir", v)} />
        <Field label="Resume mode" value={c.resume_mode} onChange={(v) => u("resume_mode", v)} type="select" options={[{ value: "auto", label: "Auto" }, { value: "disable", label: "Disabled" }, { value: "resume_only", label: "Resume only" }]} />
      </Section>
    </>
  );
}

function LoggerInspector({ data, update }: { data: LoggerNodeData; update: (d: Partial<LoggerNodeData>) => void }) {
  const allLoggers = ["console", "wandb", "tensorboard", "swanlab", "mlflow"];
  return (
    <>
      <Section title="Loggers">
        {allLoggers.map((l) => (
          <Field
            key={l}
            label={l}
            value={data.loggers.includes(l)}
            onChange={(v) =>
              update({
                loggers: v
                  ? [...data.loggers, l]
                  : data.loggers.filter((x) => x !== l),
              })
            }
            type="boolean"
          />
        ))}
      </Section>
      <Section title="Project">
        <Field label="Project name" value={data.projectName} onChange={(v) => update({ projectName: String(v) })} />
        <Field label="Experiment name" value={data.experimentName} onChange={(v) => update({ experimentName: String(v) })} />
      </Section>
    </>
  );
}

function RayInspector({ data, update }: { data: RayNodeData; update: (d: Partial<RayNodeData>) => void }) {
  const c = data.config;
  const u = (k: string, v: unknown) => update({ config: { ...c, ray_init: { ...c.ray_init, [k]: v } } });
  return (
    <>
      <Section title="Ray Init">
        <Field label="Address (leave blank for auto)" value={c.ray_init?.address} onChange={(v) => u("address", v || undefined)} />
        <Field label="Num CPUs (blank = auto)" value={c.ray_init?.num_cpus} onChange={(v) => u("num_cpus", v ? Number(v) : undefined)} type="number" />
        <Field label="Timeline JSON" value={c.timeline_json_file} onChange={(v) => update({ config: { ...c, timeline_json_file: String(v) || undefined } })} />
      </Section>
    </>
  );
}

function SshInspector({ data, update }: { data: SshNodeData; update: (d: Partial<SshNodeData>) => void }) {
  return (
    <>
      <Section title="Connection">
        <Field label="Host" value={data.host} onChange={(v) => update({ host: String(v) })} />
        <Field label="Port" value={data.port} onChange={(v) => update({ port: Number(v) })} type="number" />
        <Field label="Username" value={data.username} onChange={(v) => update({ username: String(v) })} />
        <Field label="Auth type" value={data.authType} onChange={(v) => update({ authType: v as SshNodeData["authType"] })} type="select" options={[{ value: "agent", label: "SSH Agent" }, { value: "key", label: "Private Key" }, { value: "password", label: "Password" }]} />
        {data.authType === "key" && (
          <Field label="Key path" value={data.keyPath} onChange={(v) => update({ keyPath: String(v) })} />
        )}
      </Section>
      <Section title="Remote">
        <Field label="Work directory" value={data.remoteWorkDir} onChange={(v) => update({ remoteWorkDir: String(v) })} />
        <Field label="Python command" value={data.pythonCmd} onChange={(v) => update({ pythonCmd: String(v) })} />
      </Section>
    </>
  );
}

export function NodeInspector() {
  const { nodes, selectedNodeId, updateNodeData } = useFlowStore();
  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-4">
        <span className="text-2xl">◎</span>
        <span>Select a node to configure it</span>
      </div>
    );
  }

  const data = node.data as AnyNodeData;
  const update = (partial: Partial<AnyNodeData>) =>
    updateNodeData(node.id, partial);

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="text-sm font-semibold text-foreground mb-3">{data.label}</div>

      {data.nodeType === "model" && (
        <ModelInspector data={data as ModelNodeData} update={update} />
      )}
      {data.nodeType === "dataset" && (
        <DatasetInspector data={data as DatasetNodeData} update={update} />
      )}
      {data.nodeType === "actor" && (
        <ActorInspector data={data as ActorNodeData} update={update} />
      )}
      {data.nodeType === "rollout" && (
        <RolloutInspector data={data as RolloutNodeData} update={update} />
      )}
      {data.nodeType === "critic" && (
        <CriticInspector data={data as CriticNodeData} update={update} />
      )}
      {data.nodeType === "algorithm" && (
        <AlgorithmInspector data={data as AlgorithmNodeData} update={update} />
      )}
      {data.nodeType === "trainer" && (
        <TrainerInspector data={data as TrainerNodeData} update={update} />
      )}
      {data.nodeType === "logger" && (
        <LoggerInspector data={data as LoggerNodeData} update={update} />
      )}
      {data.nodeType === "ray" && (
        <RayInspector data={data as RayNodeData} update={update} />
      )}
      {data.nodeType === "ssh" && (
        <SshInspector data={data as SshNodeData} update={update} />
      )}
    </div>
  );
}
