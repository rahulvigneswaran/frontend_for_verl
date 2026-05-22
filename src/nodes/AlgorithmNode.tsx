import type { NodeProps } from "@xyflow/react";
import { BaseNode, FieldRow } from "./BaseNode";
import type { AlgorithmNodeData } from "../lib/types";

const ALGO_LABELS: Record<string, string> = {
  ppo: "PPO",
  grpo: "GRPO",
  dapo: "DAPO",
  rloo: "RLOO",
  reinforce_pp: "REINFORCE++",
};

export function AlgorithmNode(props: NodeProps) {
  const data = props.data as AlgorithmNodeData;
  const { config, algorithm } = data;
  return (
    <BaseNode {...props} data={data}>
      <FieldRow label="algorithm" value={ALGO_LABELS[algorithm] ?? algorithm} />
      <FieldRow label="adv estimator" value={config.adv_estimator ?? "—"} />
      <FieldRow label="gamma" value={config.gamma ?? 1.0} />
      <FieldRow label="lambda" value={config.lam ?? 1.0} />
      <FieldRow label="KL in reward" value={config.use_kl_in_reward ? "yes" : "no"} />
      <FieldRow label="KL coeff" value={config.kl_ctrl?.kl_coef ?? "—"} />
    </BaseNode>
  );
}
