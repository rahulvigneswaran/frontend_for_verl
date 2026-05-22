import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { ActorNodeData } from "../lib/types";

export function ActorNode(props: NodeProps) {
  const data = props.data as ActorNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="strategy" value={config.strategy ?? "fsdp"} />
      <FieldRow label="lr" value={config.lr?.toExponential(1) ?? "—"} />
      <FieldRow label="ppo mini batch" value={config.ppo_mini_batch_size ?? "—"} />
      <FieldRow label="clip ratio" value={config.clip_ratio ?? 0.2} />
      <FieldRow label="ppo epochs" value={config.ppo_epochs ?? 1} />
    </BaseNode>
  );
}
