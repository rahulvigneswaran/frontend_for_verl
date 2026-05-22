import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useJobStore } from "../store/jobStore";
import { cn } from "../lib/utils";

const METRIC_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#ef4444",
  "#14b8a6",
];

const INTERESTING_METRICS = [
  "reward",
  "loss",
  "actor/loss",
  "critic/loss",
  "kl",
  "entropy",
  "learning_rate",
  "response_length",
];

export function DashboardPanel() {
  const { jobs, metrics, activeJobId } = useJobStore();
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(["reward", "loss"]);

  const jobId = activeJobId ?? jobs[0]?.id;
  const snapshots = metrics[jobId ?? ""] ?? [];

  const availableMetrics = useMemo(() => {
    const keys = new Set<string>();
    snapshots.forEach((s) => Object.keys(s.metrics).forEach((k) => keys.add(k)));
    return Array.from(keys).sort((a, b) => {
      const ai = INTERESTING_METRICS.indexOf(a);
      const bi = INTERESTING_METRICS.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [snapshots]);

  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        step: s.step,
        epoch: s.epoch,
        ...s.metrics,
      })),
    [snapshots]
  );

  const toggleMetric = (metric: string) => {
    setSelectedMetrics((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
    );
  };

  if (snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-4">
        <span className="text-2xl">📈</span>
        <span>No metrics yet</span>
        <span className="text-xs text-center">
          Metrics appear once a job is running with W&B or TensorBoard logging
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-1">
        {availableMetrics.map((metric, i) => {
          const color = METRIC_COLORS[i % METRIC_COLORS.length];
          const active = selectedMetrics.includes(metric);
          return (
            <button
              key={metric}
              onClick={() => toggleMetric(metric)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                active ? "opacity-100" : "opacity-40"
              )}
              style={{
                background: `${color}20`,
                color,
                border: `1px solid ${active ? color : "transparent"}`,
              }}
            >
              {metric}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 22%)" />
            <XAxis
              dataKey="step"
              tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
              stroke="hsl(222 47% 22%)"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(215 20% 55%)" }}
              stroke="hsl(222 47% 22%)"
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(222 47% 13%)",
                border: "1px solid hsl(222 47% 22%)",
                borderRadius: 6,
                fontSize: 11,
              }}
              labelStyle={{ color: "hsl(213 31% 91%)" }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {selectedMetrics.map((metric, i) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={METRIC_COLORS[i % METRIC_COLORS.length]}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] text-muted-foreground">
        {snapshots.length} data points · step {snapshots[snapshots.length - 1]?.step ?? 0}
      </div>
    </div>
  );
}
