import {
  DEFAULT_POWERS,
  type LevelConfig,
  type PowersConfig,
  parseLevelFile,
  parsePowersConfig,
} from "./core.ts";

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
  try {
    const response = await fetch("/powers.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return parsePowersConfig(await response.json());
  } catch {
    return DEFAULT_POWERS;
  }
}
