import { create } from "zustand";
import type { Job, LogLine, MetricsSnapshot } from "../lib/types";

interface JobState {
  jobs: Job[];
  logs: Record<string, LogLine[]>;
  metrics: Record<string, MetricsSnapshot[]>;
  activeJobId: string | null;

  addJob: (job: Job) => void;
  updateJob: (id: string, update: Partial<Job>) => void;
  appendLog: (log: LogLine) => void;
  appendMetrics: (snapshot: MetricsSnapshot) => void;
  setActiveJobId: (id: string | null) => void;
  clearLogs: (jobId: string) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  logs: {},
  metrics: {},
  activeJobId: null,

  addJob: (job) => set((s) => ({ jobs: [job, ...s.jobs] })),

  updateJob: (id, update) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...update } : j)),
    })),

  appendLog: (log) =>
    set((s) => ({
      logs: {
        ...s.logs,
        [log.job_id]: [...(s.logs[log.job_id] ?? []).slice(-4999), log],
      },
    })),

  appendMetrics: (snapshot) =>
    set((s) => ({
      metrics: {
        ...s.metrics,
        [snapshot.job_id]: [...(s.metrics[snapshot.job_id] ?? []), snapshot],
      },
    })),

  setActiveJobId: (id) => set({ activeJobId: id }),

  clearLogs: (jobId) =>
    set((s) => ({ logs: { ...s.logs, [jobId]: [] } })),
}));
