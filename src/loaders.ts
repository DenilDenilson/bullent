import { type LevelConfig, parseLevelFile } from "./core.ts";
import { type PowersConfig, parsePowersConfig } from "./powers/index.ts";

export async function loadFirstLevel(): Promise<LevelConfig> {
  const response = await fetch("/levels.json");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const levels = parseLevelFile(await response.json()).levels;
  const first = levels[0];
  if (!first) {
    throw new Error("No levels found");
  }
  return first;
}

export async function loadPowersConfig(): Promise<PowersConfig> {
  const response = await fetch("/powers.json");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return parsePowersConfig(await response.json());
}
