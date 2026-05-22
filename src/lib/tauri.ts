import { invoke } from "@tauri-apps/api/core";
import type {
  VerlConfig,
  Job,
  MetricsSnapshot,
  Template,
  ValidationError,
} from "./types";

// Config commands
export const parseYaml = (path: string): Promise<VerlConfig> =>
  invoke("parse_yaml", { path });

export const serializeYaml = (config: VerlConfig): Promise<string> =>
  invoke("serialize_yaml", { config });

export const saveYaml = (config: VerlConfig, path: string): Promise<void> =>
  invoke("save_yaml", { config, path });

export const validateConfig = (
  config: VerlConfig
): Promise<ValidationError[]> => invoke("validate_config", { config });

export const listTemplates = (): Promise<Template[]> =>
  invoke("list_templates");

// Job commands
export const launchLocalJob = (args: {
  configPath: string;
  workingDir: string;
  pythonCmd?: string;
  experimentName?: string;
}): Promise<string> =>
  invoke("launch_local_job", {
    configPath: args.configPath,
    workingDir: args.workingDir,
    pythonCmd: args.pythonCmd,
    experimentName: args.experimentName,
  });

export const launchRemoteJob = (args: {
  host: string;
  port: number;
  username: string;
  auth: { type: "key"; key_path: string; passphrase?: string } | { type: "password"; password: string } | { type: "agent" };
  remoteWorkDir: string;
  pythonCmd: string;
  configYaml: string;
  configName: string;
  experimentName?: string;
}): Promise<string> =>
  invoke("launch_remote_job", {
    host: args.host,
    port: args.port,
    username: args.username,
    auth: args.auth,
    remoteWorkDir: args.remoteWorkDir,
    pythonCmd: args.pythonCmd,
    configYaml: args.configYaml,
    configName: args.configName,
    experimentName: args.experimentName,
  });

export const stopJob = (jobId: string): Promise<void> =>
  invoke("stop_job", { jobId });

export const getJobStatus = (jobId: string): Promise<Job | null> =>
  invoke("get_job_status", { jobId });

export const listJobs = (): Promise<Job[]> => invoke("list_jobs");

// SSH commands
export interface SshParams {
  host: string;
  port: number;
  username: string;
  auth:
    | { type: "password"; password: string }
    | { type: "key"; key_path: string; passphrase?: string }
    | { type: "agent" };
  remoteWorkDir: string;
  pythonCmd: string;
}

export interface ConnectionResult {
  success: boolean;
  message: string;
  server_banner?: string;
}

export const testSsh = (connection: SshParams): Promise<ConnectionResult> =>
  invoke("test_ssh", { connection });

export const uploadFile = (
  connection: SshParams,
  localPath: string,
  remotePath: string
): Promise<void> => invoke("upload_file", { connection, localPath, remotePath });

export const execRemote = (
  connection: SshParams,
  command: string
): Promise<[string, string, number]> =>
  invoke("exec_remote", { connection, command });

export const listRemoteFiles = (
  connection: SshParams,
  remotePath: string
): Promise<{ name: string; path: string; is_dir: boolean; size: number }[]> =>
  invoke("list_remote_files", { connection, remotePath });

// Metrics commands
export interface WandbRun {
  id: string;
  name: string;
  state: string;
  project: string;
  created_at: string;
  url: string;
}

export const fetchWandbRuns = (
  apiKey: string,
  entity: string,
  project: string
): Promise<WandbRun[]> =>
  invoke("fetch_wandb_runs", { apiKey, entity, project });

export const pollWandbMetrics = (args: {
  apiKey: string;
  entity: string;
  project: string;
  runId: string;
  jobId: string;
  lastStep?: number;
}): Promise<MetricsSnapshot[]> =>
  invoke("poll_wandb_metrics", {
    apiKey: args.apiKey,
    entity: args.entity,
    project: args.project,
    runId: args.runId,
    jobId: args.jobId,
    lastStep: args.lastStep,
  });

export const parseTensorboardEvents = (
  logDir: string
): Promise<MetricsSnapshot[]> =>
  invoke("parse_tensorboard_events", { logDir });
