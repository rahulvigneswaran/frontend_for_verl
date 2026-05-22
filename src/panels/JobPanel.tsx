import { useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { useJobStore } from "../store/jobStore";
import { stopJob } from "../lib/tauri";
import type { LogLine, Job } from "../lib/types";
import { cn, formatDuration } from "../lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  running: "text-green-400",
  done: "text-blue-400",
  failed: "text-red-400",
  stopped: "text-muted-foreground",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-yellow-400",
  running: "bg-green-400 animate-pulse",
  done: "bg-blue-400",
  failed: "bg-red-400",
  stopped: "bg-muted-foreground",
};

function JobRow({ job, active, onSelect }: { job: Job; active: boolean; onSelect: () => void }) {
  const { updateJob } = useJobStore();

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await stopJob(job.id);
    updateJob(job.id, { status: "stopped" });
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg transition-colors text-xs",
        active ? "bg-secondary" : "hover:bg-secondary/50"
      )}
    >
      <div className={cn("w-2 h-2 rounded-full shrink-0", STATUS_DOT[job.status])} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground truncate">{job.name}</div>
        <div className="text-muted-foreground">
          {job.is_remote ? `↗ ${job.remote_host}` : "local"} ·{" "}
          {job.started_at
            ? formatDuration(job.started_at, job.finished_at)
            : "pending"}
        </div>
      </div>
      <span className={cn("shrink-0 font-medium", STATUS_COLORS[job.status])}>
        {job.status}
      </span>
      {job.status === "running" && (
        <button
          onClick={handleStop}
          className="shrink-0 text-muted-foreground hover:text-destructive transition-colors px-1"
          title="Stop job"
        >
          ■
        </button>
      )}
    </div>
  );
}

function LogViewer({ jobId }: { jobId: string }) {
  const { logs } = useJobStore();
  const lines = logs[jobId] ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  return (
    <div className="h-full overflow-y-auto bg-black/30 rounded-lg p-2 log-viewer">
      {lines.length === 0 ? (
        <div className="text-muted-foreground text-xs p-2">No output yet…</div>
      ) : (
        lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              "leading-relaxed whitespace-pre-wrap break-all",
              l.stream === "stderr" ? "text-red-400" : "text-green-300/90"
            )}
          >
            {l.line}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}

export function JobPanel() {
  const { jobs, activeJobId, appendLog, updateJob, setActiveJobId } = useJobStore();

  useEffect(() => {
    let unlisten1: (() => void) | null = null;
    let unlisten2: (() => void) | null = null;

    listen<LogLine>("job:log", (event) => {
      appendLog(event.payload);
    }).then((f) => { unlisten1 = f; }).catch(() => {});

    listen<{ job_id: string; status: string }>(
      "job:status",
      (event) => {
        updateJob(event.payload.job_id, {
          status: event.payload.status as Job["status"],
        });
      }
    ).then((f) => { unlisten2 = f; }).catch(() => {});

    return () => {
      unlisten1?.();
      unlisten2?.();
    };
  }, [appendLog, updateJob]);

  const activeJob = jobs.find((j) => j.id === activeJobId);

  return (
    <div className="flex flex-col h-full">
      {/* Job list */}
      <div className="border-b border-border">
        <div className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Jobs ({jobs.length})
        </div>
        <div className="max-h-40 overflow-y-auto">
          {jobs.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground">
              No jobs yet. Export a config and run it.
            </div>
          ) : (
            jobs.map((job) => (
              <JobRow
                key={job.id}
                job={job}
                active={job.id === activeJobId}
                onSelect={() => setActiveJobId(job.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Log viewer */}
      <div className="flex-1 flex flex-col min-h-0 p-2 gap-2">
        {activeJob ? (
          <>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">{activeJob.name}</span>
              <span className="text-muted-foreground">· logs</span>
            </div>
            <LogViewer jobId={activeJob.id} />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
            Select a job to view logs
          </div>
        )}
      </div>
    </div>
  );
}
