import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { CriticNodeData } from "../lib/types";

export function CriticNode(props: NodeProps) {
  const data = props.data as CriticNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="strategy" value={config.strategy ?? "fsdp"} />
      <FieldRow label="lr" value={config.lr?.toExponential(1) ?? "—"} />
      <FieldRow label="ppo mini batch" value={config.ppo_mini_batch_size ?? "—"} />
      <FieldRow label="cliprange value" value={config.cliprange_value ?? 0.5} />
      <FieldRow label="ppo epochs" value={config.ppo_epochs ?? 1} />
    </BaseNode>
  );
}
