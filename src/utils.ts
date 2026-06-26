import {
  type LevelConfig,
} from "./core.ts";

export function cloneLevel(source: LevelConfig): LevelConfig {
  return structuredClone(source);
}

export function numberValue(input: HTMLInputElement): number {
  return Number(input.value);
}

export function formatTime(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}