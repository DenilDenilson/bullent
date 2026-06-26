import type { Bullet, LevelConfig, Vec2 } from "../core.ts";

export type PresagioConfig = {
  cooldown: number;
  duration: number;
};

export type PresagioState = {
  activeRemaining: number;
  cooldownRemaining: number;
};

export type PresagioSegment = {
  from: Vec2;
  to: Vec2;
};

export function createPresagioState(): PresagioState {
  return {
    activeRemaining: 0,
    cooldownRemaining: 0,
  };
}

export function activatePresagio(
  state: PresagioState,
  config: PresagioConfig,
): PresagioState {
  if (state.cooldownRemaining > 0) return state;

  return {
    activeRemaining: config.duration,
    cooldownRemaining: config.cooldown,
  };
}

export function updatePresagio(
  state: PresagioState,
  rawDt: number,
): PresagioState {
  return {
    activeRemaining: Math.max(0, state.activeRemaining - rawDt),
    cooldownRemaining: Math.max(0, state.cooldownRemaining - rawDt),
  };
}

export function isPresagioActive(state: PresagioState): boolean {
  return state.activeRemaining > 0;
}

export function computePresagioSegments(
  bullets: Bullet[],
  level: LevelConfig,
): PresagioSegment[] {
  return bullets
    .map((bullet) => computeBulletPresagioSegment(bullet, level))
    .filter((segment): segment is PresagioSegment => segment != null);
}

function computeBulletPresagioSegment(
  bullet: Bullet,
  level: LevelConfig,
): PresagioSegment | null {
  const timeToXWall =
    bullet.vel.x > 0
      ? (level.arena.width - bullet.radius - bullet.pos.x) / bullet.vel.x
      : bullet.vel.x < 0
        ? (bullet.radius - bullet.pos.x) / bullet.vel.x
        : Number.POSITIVE_INFINITY;

  const timeToYWall =
    bullet.vel.y > 0
      ? (level.arena.height - bullet.radius - bullet.pos.y) / bullet.vel.y
      : bullet.vel.y < 0
        ? (bullet.radius - bullet.pos.y) / bullet.vel.y
        : Number.POSITIVE_INFINITY;

  const timeToBounce = Math.min(timeToXWall, timeToYWall);

  if (!Number.isFinite(timeToBounce) || timeToBounce <= 0) return null;

  return {
    from: { ...bullet.pos },
    to: {
      x: bullet.pos.x + bullet.vel.x * timeToBounce,
      y: bullet.pos.y + bullet.vel.y * timeToBounce,
    },
  };
}
