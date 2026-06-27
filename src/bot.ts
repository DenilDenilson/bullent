import { moveBullet, movePlayer, type Vec2 } from "./core.ts";
import type { GameSession } from "./session.ts";

export type BotInput = {
  direction: Vec2;
  slowHeld: boolean;
  useDash: boolean;
  usePresagio: boolean;
};

export type AutoplayBot = {
  think: (session: GameSession, rawDt: number) => BotInput;
  reset: () => void;
};

type BotThinkSession = Pick<
  GameSession,
  "level" | "player" | "timePickup" | "bullets"
>;

// P R O P I A S
// const bulletDangerMargin = 42;
// const bulletDangerWeight = 4;

const botDashCooldown = 1.1;
const letargoDangerThreshold = 0.35;
const presagioDangerThreshold = 0.45;
const presagioBulletThreshold = 10;
const dashDangerThreshold = 1.05;

// Recomendadas por IA
const dangerLookaheadTimes = [0, 0.12, 0.24, 0.36, 0.48, 0.6];

const bulletDangerMargin = 42;
const bulletDangerWeight = 4;

const wallDangerMargin = 0;
const wallDangerWeight = 0;

const candidateDirections: Vec2[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: 1, y: 1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: -1, y: -1 },
].map(normalize);

export function createAutoplayBot(): AutoplayBot {
  let dashCooldownRemaining = 0;

  return {
    think(session, rawDt) {
      dashCooldownRemaining = Math.max(0, dashCooldownRemaining - rawDt);

      const danger = dangerNearPlayer(session);
      const direction = chooseBotDirection(session);

      const directionDangerScore = directionDanger(session, direction);

      const useDash =
        danger >= dashDangerThreshold &&
        dashCooldownRemaining === 0 &&
        directionDangerScore < danger * 0.55;

      if (useDash) {
        dashCooldownRemaining = botDashCooldown;
      }

      return {
        direction,
        slowHeld:
          danger >= letargoDangerThreshold &&
          session.letargo.cooldownRemaining === 0 &&
          session.letargo.energy > 0.1,
        useDash,
        usePresagio:
          session.bullets.length >= presagioBulletThreshold &&
          danger >= presagioDangerThreshold &&
          session.presagio.cooldownRemaining === 0,
      };
    },

    reset() {
      dashCooldownRemaining = 0;
    },
  };
}

function dangerNearPlayer(
  session: Pick<GameSession, "level" | "player" | "bullets">,
): number {
  let danger = 0;

  for (const bullet of session.bullets) {
    const unsafeDistance =
      session.player.radius + bullet.radius + bulletDangerMargin;

    for (const time of dangerLookaheadTimes) {
      const futureBullet = moveBullet(bullet, time, session.level);
      const distance = distanceBetween(session.player.pos, futureBullet.pos);

      if (distance < unsafeDistance) {
        const closeness = (unsafeDistance - distance) / unsafeDistance;
        danger += closeness * closeness;
      }
    }
  }

  return danger;
}

export function thinkBot(session: GameSession): BotInput {
  return {
    direction: chooseBotDirection(session),
    slowHeld: false,
    useDash: false,
    usePresagio: false,
  };
}

export function chooseBotDirection(session: BotThinkSession): Vec2 {
  let bestDirection: Vec2 = { x: 0, y: 0 };
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const direction of candidateDirections) {
    const score = scoreDirection(session, direction);

    if (score > bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

function scoreDirection(session: BotThinkSession, direction: Vec2): number {
  const danger = directionDanger(session, direction);

  return (
    scorePickupDirection(session, direction) *
      pickupWeightFor(session, danger) -
    danger * bulletDangerWeight +
    scoreWallSafety(session, direction)
  );
}

function scorePickupDirection(
  session: BotThinkSession,
  direction: Vec2,
): number {
  const desiredDirection = directionTo(
    session.player.pos,
    session.timePickup.pos,
  );

  return dot(direction, desiredDirection);
}

function pickupWeightFor(session: BotThinkSession, danger: number): number {
  if (danger > 0.55) return 0.12;
  if (session.bullets.length >= 22) return 0.28;
  if (session.bullets.length >= 12) return 0.55;

  return 1;
}

function directionDanger(session: BotThinkSession, direction: Vec2): number {
  let danger = 0;

  for (const time of dangerLookaheadTimes) {
    const futurePlayer = movePlayer(
      session.player,
      direction,
      time,
      session.level,
    );

    for (const bullet of session.bullets) {
      const futureBullet = moveBullet(bullet, time, session.level);
      const unsafeDistance =
        session.player.radius + bullet.radius + bulletDangerMargin;
      const distance = distanceBetween(futurePlayer.pos, futureBullet.pos);

      if (distance < unsafeDistance) {
        const closeness = (unsafeDistance - distance) / unsafeDistance;
        danger += closeness * closeness;
      }
    }
  }

  return danger;
}

function scoreWallSafety(session: BotThinkSession, direction: Vec2): number {
  const futurePlayer = movePlayer(
    session.player,
    direction,
    0.36,
    session.level,
  );

  const wallDistance = Math.min(
    futurePlayer.pos.x - session.player.radius,
    session.level.arena.width - session.player.radius - futurePlayer.pos.x,
    futurePlayer.pos.y - session.player.radius,
    session.level.arena.height - session.player.radius - futurePlayer.pos.y,
  );

  if (wallDistance >= wallDangerMargin) {
    return 0;
  }

  const closeness = (wallDangerMargin - wallDistance) / wallDangerMargin;

  return -closeness * wallDangerWeight;
}

function directionTo(from: Vec2, to: Vec2): Vec2 {
  return normalize({
    x: to.x - from.x,
    y: to.y - from.y,
  });
}

function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);

  if (length === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function distanceBetween(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
