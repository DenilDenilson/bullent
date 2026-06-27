import { circlesTouch, type LevelConfig, type Player, type Vec2 } from "./core.ts";

export const TIME_PICKUP_BONUS_SECONDS = 15;
const timePickupRadius = 13;
const spawnPadding = 28;
const minPlayerDistance = 88;

export type TimePickup = {
  pos: Vec2;
  radius: number;
  value: number;
};

export function createTimePickup(
  level: LevelConfig,
  player: Player,
  random: () => number = Math.random,
): TimePickup {
  let candidate = randomTimePickup(level, random);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (distance(candidate.pos, player.pos) >= minPlayerDistance) {
      return candidate;
    }

    candidate = randomTimePickup(level, random);
  }

  // ponytail: small arenas may not have a far-safe point; accept the last candidate.
  return candidate;
}

export function playerCollectsTimePickup(
  player: Player,
  pickup: TimePickup,
): boolean {
  return circlesTouch(player, pickup);
}

function randomTimePickup(
  level: LevelConfig,
  random: () => number,
): TimePickup {
  const minX = spawnPadding + timePickupRadius;
  const maxX = level.arena.width - spawnPadding - timePickupRadius;
  const minY = spawnPadding + timePickupRadius;
  const maxY = level.arena.height - spawnPadding - timePickupRadius;

  return {
    pos: {
      x: randomBetween(minX, maxX, random),
      y: randomBetween(minY, maxY, random),
    },
    radius: timePickupRadius,
    value: TIME_PICKUP_BONUS_SECONDS,
  };
}

function randomBetween(
  min: number,
  max: number,
  random: () => number,
): number {
  return min + (max - min) * random();
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
