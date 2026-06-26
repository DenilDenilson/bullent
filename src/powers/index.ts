import { isRecord, requireNumber } from "../validation.ts";

import type { DestelloConfig } from "./destello.ts";
import type { LetargoConfig } from "./letargo.ts";
import type { PresagioConfig } from "./presagio.ts";

export type PowersConfig = {
  version: 1;
  destello: DestelloConfig;
  letargo: LetargoConfig;
  presagio: PresagioConfig;
};

export function parsePowersConfig(input: unknown): PowersConfig {
  if (!isRecord(input)) {
    throw new Error("powers.json must be an object");
  }

  if (input.version !== 1) {
    throw new Error("powers.json version must be 1");
  }

  const destello = isRecord(input.destello) ? input.destello : {};
  const letargo = isRecord(input.letargo) ? input.letargo : {};
  const visual = isRecord(letargo.visual) ? letargo.visual : {};
  const presagio = isRecord(input.presagio) ? input.presagio : {};

  const timeScale = requireNumber(letargo.timeScale, "letargo.timeScale");

  if (timeScale >= 1) {
    throw new Error("letargo.timeScale must be less than 1");
  }

  return {
    version: 1,
    destello: {
      distance: requireNumber(destello.distance, "destello.distance"),
    },
    letargo: {
      maxEnergy: requireNumber(letargo.maxEnergy, "letargo.maxEnergy"),
      cooldown: requireNumber(letargo.cooldown, "letargo.cooldown"),
      timeScale,
      rechargeRate: requireNumber(letargo.rechargeRate, "letargo.rechargeRate"),
      visual: {
        trailInterval: requireNumber(
          visual.trailInterval,
          "letargo.visual.trailInterval",
        ),
        trailLifetime: requireNumber(
          visual.trailLifetime,
          "letargo.visual.trailLifetime",
        ),
      },
    },
    presagio: {
      cooldown: requireNumber(presagio.cooldown, "presagio.cooldown"),
      duration: requireNumber(presagio.duration, "presagio.duration"),
    },
  };
}
