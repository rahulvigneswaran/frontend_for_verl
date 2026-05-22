import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SshProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: "password" | "key" | "agent";
  keyPath?: string;
  remoteWorkDir: string;
  pythonCmd: string;
}

export interface WandbSettings {
  apiKey: string;
  entity: string;
  defaultProject: string;
}

interface ConnectionState {
  sshProfiles: SshProfile[];
  activeSshProfileId: string | null;
  wandb: WandbSettings;
  hfToken: string;
  pythonCmd: string;
  workingDir: string;

  addSshProfile: (profile: SshProfile) => void;
  removeSshProfile: (id: string) => void;
  updateSshProfile: (id: string, update: Partial<SshProfile>) => void;
  setActiveSshProfile: (id: string | null) => void;
  setWandb: (settings: Partial<WandbSettings>) => void;
  setHfToken: (token: string) => void;
  setPythonCmd: (cmd: string) => void;
  setWorkingDir: (dir: string) => void;
}

export const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      sshProfiles: [],
      activeSshProfileId: null,
      wandb: { apiKey: "", entity: "", defaultProject: "" },
      hfToken: "",
      pythonCmd: "python3",
      workingDir: "~/verl_runs",

      addSshProfile: (profile) =>
        set((s) => ({ sshProfiles: [...s.sshProfiles, profile] })),

      removeSshProfile: (id) =>
        set((s) => ({
          sshProfiles: s.sshProfiles.filter((p) => p.id !== id),
          activeSshProfileId: s.activeSshProfileId === id ? null : s.activeSshProfileId,
        })),

      updateSshProfile: (id, update) =>
        set((s) => ({
          sshProfiles: s.sshProfiles.map((p) => (p.id === id ? { ...p, ...update } : p)),
        })),

      setActiveSshProfile: (id) => set({ activeSshProfileId: id }),
      setWandb: (settings) => set((s) => ({ wandb: { ...s.wandb, ...settings } })),
      setHfToken: (token) => set({ hfToken: token }),
      setPythonCmd: (cmd) => set({ pythonCmd: cmd }),
      setWorkingDir: (dir) => set({ workingDir: dir }),
    }),
    { name: "verl-studio-connections" }
  )
);
