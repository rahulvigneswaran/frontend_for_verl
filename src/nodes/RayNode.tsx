import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { RayNodeData } from "../lib/types";

export function RayNode(props: NodeProps) {
  const data = props.data as RayNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data} hasOutput={false}>
      <FieldRow
        label="address"
        value={config.ray_init?.address ?? "auto"}
      />
      <FieldRow
        label="num CPUs"
        value={config.ray_init?.num_cpus ?? "auto"}
      />
      <FieldRow
        label="timeline"
        value={config.timeline_json_file ?? "off"}
      />
    </BaseNode>
  );
}
