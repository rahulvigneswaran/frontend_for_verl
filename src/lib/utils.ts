import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(startIso: string, endIso?: string): string {
  const start = new Date(startIso).getTime();
  const end = endIso ? new Date(endIso).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export async function searchHFModels(query: string): Promise<{ id: string; downloads: number; pipeline_tag: string }[]> {
  if (!query.trim()) return [];
  try {
    const url = `https://huggingface.co/api/models?search=${encodeURIComponent(query)}&limit=10&sort=downloads&direction=-1&filter=text-generation`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { id: string; downloads?: number; pipeline_tag?: string }[];
    return data.map(m => ({ id: m.id, downloads: m.downloads ?? 0, pipeline_tag: m.pipeline_tag ?? "" }));
  } catch {
    return [];
  }
}

export const POPULAR_HF_MODELS = [
  "Qwen/Qwen2.5-7B-Instruct",
  "Qwen/Qwen2.5-14B-Instruct",
  "Qwen/Qwen2.5-32B-Instruct",
  "Qwen/Qwen3-8B",
  "Qwen/Qwen3-14B",
  "meta-llama/Llama-3.1-8B-Instruct",
  "meta-llama/Llama-3.1-70B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B",
  "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B",
  "mistralai/Mistral-7B-Instruct-v0.3",
  "google/gemma-2-9b-it",
];
