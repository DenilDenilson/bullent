import type { Player, Vec2 } from "../core.ts";

export type LetargoVisualConfig = {
  trailInterval: number;
  trailLifetime: number;
};

export type LetargoConfig = {
  maxEnergy: number;
  cooldown: number;
  timeScale: number;
  rechargeRate: number;
  visual: LetargoVisualConfig;
};

export type LetargoState = {
  energy: number;
  cooldownRemaining: number;
  active: boolean;
};

export type LetargoTrailPoint = {
  pos: Vec2;
  radius: number;
  age: number;
};

export function createLetargoState(config: LetargoConfig): LetargoState {
  return {
    energy: config.maxEnergy,
    cooldownRemaining: 0,
    active: false,
  };
}

export function updateLetargo(
  state: LetargoState,
  holding: boolean,
  rawDt: number,
  config: LetargoConfig,
): { state: LetargoState; simulationDt: number } {
  let energy = state.energy;
  let cooldownRemaining = state.cooldownRemaining;

  if (cooldownRemaining > 0) {
    cooldownRemaining = Math.max(0, cooldownRemaining - rawDt);

    if (cooldownRemaining === 0) {
      energy = config.maxEnergy;
    }

    return {
      simulationDt: rawDt,
      state: {
        energy,
        cooldownRemaining,
        active: false,
      },
    };
  }

  if (holding && energy > 0) {
    const spent = Math.min(rawDt, energy);
    const normalTime = rawDt - spent;

    energy = Math.max(0, energy - spent);

    if (energy === 0) {
      cooldownRemaining = config.cooldown;
    }

    return {
      simulationDt: spent * config.timeScale + normalTime,
      state: {
        energy,
        cooldownRemaining,
        active: energy > 0,
      },
    };
  }

  return {
    simulationDt: rawDt,
    state: {
      energy: Math.min(config.maxEnergy, energy + config.rechargeRate * rawDt),
      cooldownRemaining: 0,
      active: false,
    },
  };
}

export function updateLetargoTrail(args: {
  trail: LetargoTrailPoint[];
  clock: number;
  player: Player;
  rawDt: number;
  active: boolean;
  config: LetargoConfig;
}): { trail: LetargoTrailPoint[]; clock: number } {
  const trail = args.trail
    .map((point) => ({ ...point, age: point.age + args.rawDt }))
    .filter((point) => point.age < args.config.visual.trailLifetime);

  if (!args.active) {
    return {
      trail,
      clock: 0,
    };
  }

  const clock = args.clock + args.rawDt;

  if (clock < args.config.visual.trailInterval) {
    return {
      trail,
      clock,
    };
  }

  return {
    trail: [
      ...trail,
      {
        pos: { ...args.player.pos },
        radius: args.player.radius,
        age: 0,
      },
    ],
    clock: 0,
  };
}