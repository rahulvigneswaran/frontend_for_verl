import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { DatasetNodeData } from "../lib/types";

export function DatasetNode(props: NodeProps) {
  const data = props.data as DatasetNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data} hasInput={false}>
      <FieldRow label="train batch" value={config.train_batch_size ?? "—"} />
      <FieldRow label="max prompt len" value={config.max_prompt_length ?? "—"} />
      <FieldRow label="max resp len" value={config.max_response_length ?? "—"} />
      <FieldRow label="train files" value={`${config.train_files?.length ?? 0} file(s)`} />
    </BaseNode>
  );
}
