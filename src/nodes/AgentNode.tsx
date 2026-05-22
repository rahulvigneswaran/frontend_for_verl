import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { AgentNodeData } from "../lib/types";

export function AgentNode(props: NodeProps) {
  const data = props.data as AgentNodeData;
  const { config } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="framework" value={config.framework ?? "langgraph"} />
      <FieldRow label="agent class" value={config.agent_class ?? "—"} />
      <FieldRow label="max steps" value={config.max_steps ?? 10} />
      <FieldRow label="tools" value={`${config.tools?.length ?? 0} tool(s)`} />
    </BaseNode>
  );
}
