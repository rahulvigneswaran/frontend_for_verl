import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { RewardModelNodeData } from "../lib/types";

export function RewardModelNode(props: NodeProps) {
  const data = props.data as RewardModelNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="enabled" value={config.enable ? "yes" : "no"} />
      <FieldRow label="strategy" value={config.strategy ?? "fsdp"} />
      <FieldRow label="model" value={config.model?.path?.split("/").pop() ?? "—"} />
    </BaseNode>
  );
}
