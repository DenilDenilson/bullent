export type Vec2 = {
  x: number;
  y: number;
};

export type GameState = "ready" | "running" | "dead";

export type Player = {
  pos: Vec2;
  radius: number;
  speed: number;
};

export type Bullet = {
  pos: Vec2;
  vel: Vec2;
  radius: number;
};

export type Shooter = {
  pos: Vec2;
  cooldown: number;
  elapsed: number;
};

export type ShooterConfig = {
  x: number;
  y: number;
  cooldown: number;
};

export type LevelConfig = {
  id: number;
  name: string;
  arena: {
    width: number;
    height: number;
  };
  player: {
    radius: number;
    speed: number;
  };
  bullets: {
    radius: number;
    speed: number;
    max: number;
  };
  shooters: ShooterConfig[];
};

export type LevelFile = {
  version: 1;
  levels: LevelConfig[];
};

export type SlowMotionConfig = {
  maxEnergy: number;
  cooldown: number;
  timeScale: number;
  rechargeRate: number;
};

export type PowersConfig = {
  version: 1;
  slowMotion: SlowMotionConfig;
};

export type SlowMotionState = {
  energy: number;
  cooldownRemaining: number;
  active: boolean;
};

export const DEFAULT_LEVEL: LevelConfig = {
  id: 1,
  name: "First Contact",
  arena: {
    width: 460,
    height: 560,
  },
  player: {
    radius: 10,
    speed: 220,
  },
  bullets: {
    radius: 5,
    speed: 180,
    max: 80,
  },
  shooters: [
    {
      x: 230,
      y: 28,
      cooldown: 0.9,
    },
  ],
};

export const DEFAULT_POWERS: PowersConfig = {
  version: 1,
  slowMotion: {
    maxEnergy: 3,
    cooldown: 5,
    timeScale: 0.45,
    rechargeRate: 1,
  },
};

export function createPlayer(level: LevelConfig = DEFAULT_LEVEL): Player {
  return {
    pos: { x: level.arena.width / 2, y: level.arena.height / 2 },
    radius: level.player.radius,
    speed: level.player.speed,
  };
}

export function createShooter(config: ShooterConfig = DEFAULT_LEVEL.shooters[0]): Shooter {
  return {
    pos: { x: config.x, y: config.y },
    elapsed: 0,
    cooldown: config.cooldown,
  };
}

export function createShooters(level: LevelConfig = DEFAULT_LEVEL): Shooter[] {
  return level.shooters.map((shooter) => createShooter(shooter));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function movePlayer(player: Player, direction: Vec2, dt: number, level: LevelConfig = DEFAULT_LEVEL): Player {
  const length = Math.hypot(direction.x, direction.y);
  const input = length > 0 ? { x: direction.x / length, y: direction.y / length } : { x: 0, y: 0 };

  return {
    ...player,
    pos: {
      x: clamp(player.pos.x + input.x * player.speed * dt, player.radius, level.arena.width - player.radius),
      y: clamp(player.pos.y + input.y * player.speed * dt, player.radius, level.arena.height - player.radius),
    },
  };
}

export function spawnBullet(shooter: Shooter, target: Vec2, level: LevelConfig = DEFAULT_LEVEL): Bullet {
  const dx = target.x - shooter.pos.x;
  const dy = target.y - shooter.pos.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    pos: { ...shooter.pos },
    vel: {
      x: (dx / length) * level.bullets.speed,
      y: (dy / length) * level.bullets.speed,
    },
    radius: level.bullets.radius,
  };
}

export function moveBullet(bullet: Bullet, dt: number, level: LevelConfig = DEFAULT_LEVEL): Bullet {
  const next: Bullet = {
    ...bullet,
    pos: {
      x: bullet.pos.x + bullet.vel.x * dt,
      y: bullet.pos.y + bullet.vel.y * dt,
    },
    vel: { ...bullet.vel },
  };

  if (next.pos.x < next.radius || next.pos.x > level.arena.width - next.radius) {
    next.pos.x = clamp(next.pos.x, next.radius, level.arena.width - next.radius);
    next.vel.x *= -1;
  }

  if (next.pos.y < next.radius || next.pos.y > level.arena.height - next.radius) {
    next.pos.y = clamp(next.pos.y, next.radius, level.arena.height - next.radius);
    next.vel.y *= -1;
  }

  return next;
}

export function circlesTouch(a: { pos: Vec2; radius: number }, b: { pos: Vec2; radius: number }): boolean {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) <= a.radius + b.radius;
}

export function createSlowMotionState(config: SlowMotionConfig = DEFAULT_POWERS.slowMotion): SlowMotionState {
  return {
    energy: config.maxEnergy,
    cooldownRemaining: 0,
    active: false,
  };
}

export function updateSlowMotion(
  state: SlowMotionState,
  holding: boolean,
  rawDt: number,
  config: SlowMotionConfig = DEFAULT_POWERS.slowMotion,
): { state: SlowMotionState; simulationDt: number } {
  let energy = state.energy;
  let cooldownRemaining = state.cooldownRemaining;

  if (cooldownRemaining > 0) {
    cooldownRemaining = Math.max(0, cooldownRemaining - rawDt);
    if (cooldownRemaining === 0) {
      energy = config.maxEnergy;
    }

    return {
      simulationDt: rawDt,
      state: { energy, cooldownRemaining, active: false },
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
      state: { energy, cooldownRemaining, active: energy > 0 },
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${path} must be a positive number`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

export function parseLevelFile(input: unknown): LevelFile {
  if (!isRecord(input)) {
    throw new Error("levels.json must be an object");
  }
  if (input.version !== 1) {
    throw new Error("levels.json version must be 1");
  }
  if (!Array.isArray(input.levels) || input.levels.length === 0) {
    throw new Error("levels.json levels must contain at least one level");
  }

  return {
    version: 1,
    levels: input.levels.map(parseLevel),
  };
}

export function parsePowersConfig(input: unknown): PowersConfig {
  if (!isRecord(input)) {
    throw new Error("powers.json must be an object");
  }
  if (input.version !== 1) {
    throw new Error("powers.json version must be 1");
  }

  const slowMotion = isRecord(input.slowMotion) ? input.slowMotion : {};
  const timeScale = requireNumber(slowMotion.timeScale, "slowMotion.timeScale");
  if (timeScale >= 1) {
    throw new Error("slowMotion.timeScale must be less than 1");
  }

  return {
    version: 1,
    slowMotion: {
      maxEnergy: requireNumber(slowMotion.maxEnergy, "slowMotion.maxEnergy"),
      cooldown: requireNumber(slowMotion.cooldown, "slowMotion.cooldown"),
      timeScale,
      rechargeRate: requireNumber(slowMotion.rechargeRate, "slowMotion.rechargeRate"),
    },
  };
}

function parseLevel(input: unknown, index: number): LevelConfig {
  const path = `levels[${index}]`;
  if (!isRecord(input)) {
    throw new Error(`${path} must be an object`);
  }

  const arena = isRecord(input.arena) ? input.arena : {};
  const player = isRecord(input.player) ? input.player : {};
  const bullets = isRecord(input.bullets) ? input.bullets : {};
  const shootersInput = input.shooters;
  if (!Array.isArray(shootersInput) || shootersInput.length === 0) {
    throw new Error(`${path}.shooters must contain at least one shooter`);
  }

  const level: LevelConfig = {
    id: requireNumber(input.id, `${path}.id`),
    name: requireString(input.name, `${path}.name`),
    arena: {
      width: requireNumber(arena.width, `${path}.arena.width`),
      height: requireNumber(arena.height, `${path}.arena.height`),
    },
    player: {
      radius: requireNumber(player.radius, `${path}.player.radius`),
      speed: requireNumber(player.speed, `${path}.player.speed`),
    },
    bullets: {
      radius: requireNumber(bullets.radius, `${path}.bullets.radius`),
      speed: requireNumber(bullets.speed, `${path}.bullets.speed`),
      max: requireNumber(bullets.max, `${path}.bullets.max`),
    },
    shooters: shootersInput.map((shooter, shooterIndex) => parseShooter(shooter, `${path}.shooters[${shooterIndex}]`)),
  };

  if (level.bullets.max < level.shooters.length) {
    throw new Error(`${path}.bullets.max must be at least the shooter count`);
  }

  for (const [shooterIndex, shooter] of level.shooters.entries()) {
    if (shooter.x > level.arena.width || shooter.y > level.arena.height) {
      throw new Error(`${path}.shooters[${shooterIndex}] must be inside the arena`);
    }
  }

  return level;
}

function parseShooter(input: unknown, path: string): ShooterConfig {
  if (!isRecord(input)) {
    throw new Error(`${path} must be an object`);
  }

  return {
    x: requireNumber(input.x, `${path}.x`),
    y: requireNumber(input.y, `${path}.y`),
    cooldown: requireNumber(input.cooldown, `${path}.cooldown`),
  };
}
