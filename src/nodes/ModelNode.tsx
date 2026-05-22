import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { ModelNodeData } from "../lib/types";

export function ModelNode(props: NodeProps) {
  const data = props.data as ModelNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="path" value={config.path?.split("/").pop() ?? "—"} />
      <FieldRow label="dtype" value={config.dtype ?? "bfloat16"} />
      <FieldRow label="fused kernels" value={config.use_fused_kernels ? "yes" : "no"} />
      <FieldRow label="grad ckpt" value={config.enable_gradient_checkpointing ? "yes" : "no"} />
    </BaseNode>
  );
}
