import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { CustomRewardNodeData } from "../lib/types";

export function CustomRewardNode(props: NodeProps) {
  const data = props.data as CustomRewardNodeData;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="module path" value={data.config.path?.split("/").pop() ?? "—"} />
      <FieldRow label="function" value={data.config.name ?? "compute_reward"} />
    </BaseNode>
  );
}
