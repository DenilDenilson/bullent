import { circlesTouch, moveBullet, movePlayer, type Vec2 } from "./core.ts";
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

export type BotTuning = {
  botDashCooldown: number;
  letargoDangerThreshold: number;
  presagioDangerThreshold: number;
  presagioBulletThreshold: number;
  dashDangerThreshold: number;
  dashSafetyRatio: number;
  bulletDangerMargin: number;
  bulletDangerWeight: number;
  dangerPickupWeight: number;
  crowdedPickupWeight: number;
  mediumPickupWeight: number;
  safePickupWeight: number;
};

type BotThinkSession = Pick<
  GameSession,
  "level" | "player" | "timePickup" | "bullets"
>;

export const defaultBotTuning: BotTuning = {
  botDashCooldown: 1.371,
  letargoDangerThreshold: 0.662,
  presagioDangerThreshold: 0.796,
  presagioBulletThreshold: 10,
  dashDangerThreshold: 0.795,
  dashSafetyRatio: 0.087,
  bulletDangerMargin: 31.309,
  bulletDangerWeight: 3.505,
  dangerPickupWeight: 0.054,
  crowdedPickupWeight: 0.285,
  mediumPickupWeight: 0.659,
  safePickupWeight: 0.753,
};

// Recomendadas por IA
const dangerLookaheadTimes = [0, 0.12, 0.24, 0.36, 0.48, 0.6];

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

export function createAutoplayBot(
  tuning: BotTuning = defaultBotTuning,
): AutoplayBot {
  let dashCooldownRemaining = 0;

  return {
    think(session, rawDt) {
      dashCooldownRemaining = Math.max(0, dashCooldownRemaining - rawDt);

      const danger = dangerNearPlayer(session, tuning);
      const direction = chooseBotDirection(session, tuning);

      const directionDangerScore = directionDanger(session, direction, tuning);

      const useDash =
        danger >= tuning.dashDangerThreshold &&
        dashCooldownRemaining === 0 &&
        directionDangerScore < danger * tuning.dashSafetyRatio &&
        botDashSurvives(session, direction, tuning);

      if (useDash) {
        dashCooldownRemaining = tuning.botDashCooldown;
      }

      return {
        direction,
        slowHeld:
          danger >= tuning.letargoDangerThreshold &&
          session.letargo.cooldownRemaining === 0 &&
          session.letargo.energy > 0.1,
        useDash,
        usePresagio:
          session.bullets.length >= tuning.presagioBulletThreshold &&
          danger >= tuning.presagioDangerThreshold &&
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
  tuning: BotTuning,
): number {
  let danger = 0;

  for (const bullet of session.bullets) {
    const unsafeDistance =
      session.player.radius + bullet.radius + tuning.bulletDangerMargin;

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

export function botDashSurvives(
  session: GameSession,
  direction: Vec2,
  tuning: BotTuning = defaultBotTuning,
): boolean {
  const dashDirection = isMoving(direction) ? direction : session.lastDirection;
  const dashedPlayer = movePlayer(
    session.player,
    dashDirection,
    session.powers.destello.distance / session.player.speed,
    session.level,
  );

  if (session.bullets.some((bullet) => circlesTouch(dashedPlayer, bullet))) {
    return false;
  }

  // ponytail: sampled landing check only; upgrade to swept dash collision if needed.
  return (
    directionDanger(
      { ...session, player: dashedPlayer },
      { x: 0, y: 0 },
      tuning,
    ) === 0
  );
}

export function thinkBot(session: GameSession): BotInput {
  return {
    direction: chooseBotDirection(session),
    slowHeld: false,
    useDash: false,
    usePresagio: false,
  };
}

export function chooseBotDirection(
  session: BotThinkSession,
  tuning: BotTuning = defaultBotTuning,
): Vec2 {
  let bestDirection: Vec2 = { x: 0, y: 0 };
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const direction of candidateDirections) {
    const score = scoreDirection(session, direction, tuning);

    if (score > bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

function scoreDirection(
  session: BotThinkSession,
  direction: Vec2,
  tuning: BotTuning,
): number {
  const danger = directionDanger(session, direction, tuning);

  return (
    scorePickupDirection(session, direction) *
      pickupWeightFor(session, danger, tuning) -
    danger * tuning.bulletDangerWeight +
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

function pickupWeightFor(
  session: BotThinkSession,
  danger: number,
  tuning: BotTuning,
): number {
  if (danger > 0.55) return tuning.dangerPickupWeight;
  if (session.bullets.length >= 22) return tuning.crowdedPickupWeight;
  if (session.bullets.length >= 12) return tuning.mediumPickupWeight;

  return tuning.safePickupWeight;
}

function directionDanger(
  session: BotThinkSession,
  direction: Vec2,
  tuning: BotTuning,
): number {
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
        session.player.radius + bullet.radius + tuning.bulletDangerMargin;
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

function isMoving(direction: Vec2): boolean {
  return direction.x !== 0 || direction.y !== 0;
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
