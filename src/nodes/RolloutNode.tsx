import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { RolloutNodeData } from "../lib/types";

export function RolloutNode(props: NodeProps) {
  const data = props.data as RolloutNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="engine" value={config.name ?? "vllm"} />
      <FieldRow label="n (samples)" value={config.n ?? 1} />
      <FieldRow label="temperature" value={config.temperature ?? 1.0} />
      <FieldRow label="max tokens" value={config.max_tokens ?? "—"} />
      <FieldRow label="tensor MP" value={config.tensor_model_parallel_size ?? 1} />
      <FieldRow label="GPU mem" value={`${((config.gpu_memory_utilization ?? 0.85) * 100).toFixed(0)}%`} />
    </BaseNode>
  );
}
