import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { TrainerNodeData } from "../lib/types";

export function TrainerNode(props: NodeProps) {
  const data = props.data as TrainerNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="epochs" value={config.total_epochs ?? "—"} />
      <FieldRow label="nodes" value={config.nnodes ?? 1} />
      <FieldRow label="GPUs/node" value={config.n_gpus_per_node ?? 8} />
      <FieldRow label="save freq" value={config.save_freq ?? -1} />
      <FieldRow label="val freq" value={config.test_freq ?? -1} />
      <FieldRow label="resume" value={config.resume_mode ?? "auto"} />
    </BaseNode>
  );
}
