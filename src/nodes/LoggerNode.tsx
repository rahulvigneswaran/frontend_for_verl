import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { LoggerNodeData } from "../lib/types";

const LOGGER_ICONS: Record<string, string> = {
  wandb: "W&B",
  tensorboard: "TB",
  swanlab: "SL",
  console: "CLI",
  mlflow: "ML",
};

export function LoggerNode(props: NodeProps) {
  const data = props.data as LoggerNodeData;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="project" value={data.projectName} />
      <FieldRow label="experiment" value={data.experimentName} />
      <div className="flex gap-1 flex-wrap pt-1">
        {data.loggers.map((l) => (
          <span
            key={l}
            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400"
          >
            {LOGGER_ICONS[l] ?? l}
          </span>
        ))}
      </div>
    </BaseNode>
  );
}
