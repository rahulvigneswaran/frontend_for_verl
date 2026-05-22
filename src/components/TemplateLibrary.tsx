import { TEMPLATES } from "../lib/templates";
import { useFlowStore } from "../store/flowStore";
import type { Algorithm } from "../lib/types";

const ALGO_BADGE_COLORS: Record<Algorithm, string> = {
  ppo: "bg-yellow-500/20 text-yellow-400",
  grpo: "bg-blue-500/20 text-blue-400",
  dapo: "bg-purple-500/20 text-purple-400",
  rloo: "bg-green-500/20 text-green-400",
  reinforce_pp: "bg-red-500/20 text-red-400",
};

export function TemplateLibrary() {
  const { loadTemplate } = useFlowStore();

  return (
    <div className="p-2">
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
        Templates
      </div>
      <div className="space-y-1.5">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => loadTemplate(t.algorithm, t.model)}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-xs font-medium text-foreground">{t.name}</span>
              <span
                className={`text-[9px] px-1 py-0.5 rounded font-semibold uppercase ${ALGO_BADGE_COLORS[t.algorithm]}`}
              >
                {t.algorithm}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">{t.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
