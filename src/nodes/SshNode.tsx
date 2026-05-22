import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { SshNodeData } from "../lib/types";

export function SshNode(props: NodeProps) {
  const data = props.data as SshNodeData;
  return (
    <BaseNode {...props} data={data} hasInput={false}>
      <FieldRow label="host" value={`${data.host}:${data.port}`} />
      <FieldRow label="user" value={data.username} />
      <FieldRow label="auth" value={data.authType} />
      <FieldRow label="work dir" value={data.remoteWorkDir.split("/").pop() ?? "—"} />
      <FieldRow label="python" value={data.pythonCmd} />
    </BaseNode>
  );
}
