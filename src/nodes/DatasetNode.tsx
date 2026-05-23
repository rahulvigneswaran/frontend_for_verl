import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { DatasetNodeData } from "../lib/types";

export function DatasetNode(props: NodeProps) {
  const data = props.data as DatasetNodeData;
  const { config } = data;
  const isHF = config.source === "huggingface";
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="source" value={isHF ? "HuggingFace" : "local"} />
      {isHF ? (
        <>
          <FieldRow label="dataset" value={config.hf_dataset ?? "—"} />
          <FieldRow label="split" value={config.hf_train_split ?? "train"} />
        </>
      ) : (
        <FieldRow label="train files" value={`${config.train_files?.length ?? 0} file(s)`} />
      )}
      <FieldRow label="batch size" value={config.train_batch_size ?? "—"} />
    </BaseNode>
  );
}
