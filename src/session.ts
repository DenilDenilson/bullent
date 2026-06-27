import {
  type Bullet,
  type GameState,
  type LevelConfig,
  type Player,
  type Shooter,
  type Vec2,
  circlesTouch,
  createPlayer,
  createShooters,
  moveBullet,
  movePlayer,
  spawnBullet,
} from "./core.ts";
import { applyDestello } from "./powers/destello.ts";
import type { PowersConfig } from "./powers/index.ts";
import {
  createLetargoState,
  type LetargoState,
  type LetargoTrailPoint,
  updateLetargo,
  updateLetargoTrail,
} from "./powers/letargo.ts";
import {
  activatePresagio,
  computePresagioSegments,
  createPresagioState,
  isPresagioActive,
  updatePresagio,
  type PresagioSegment,
  type PresagioState,
} from "./powers/presagio.ts";
import {
  createTimePickup,
  playerCollectsTimePickup,
  type TimePickup,
} from "./pickups.ts";
import { cloneLevel } from "./utils.ts";

const pickupEffectLifetime = 0.7;
const dashEffectLifetime = 0.26;
const replayWindowSeconds = 2.5;

export type PickupCollectEffect = {
  pos: Vec2;
  value: number;
  age: number;
};

export type DashEffect = {
  from: Vec2;
  to: Vec2;
  age: number;
};

export type ReplayFrame = {
  time: number;
  player: Player;
  bullets: Bullet[];
  timePickup: TimePickup | null;
};

export type GameSession = {
  level: LevelConfig;
  powers: PowersConfig;
  state: GameState;
  player: Player;
  shooters: Shooter[];
  bullets: Bullet[];
  letargo: LetargoState;
  presagio: PresagioState;
  presagioSegments: PresagioSegment[];
  timePickup: TimePickup;
  bonusTime: number;
  pickupCollectEffects: PickupCollectEffect[];
  dashEffects: DashEffect[];
  elapsed: number;
  lastDirection: Vec2;
  playerTrail: LetargoTrailPoint[];
  playerTrailClock: number;
  killingBullet: Bullet | null;
  replayClock: number;
  replayFrames: ReplayFrame[];
  deathReplayFrames: ReplayFrame[];
};

export type GameSessionUpdateResult = {
  died: boolean;
  collectedTimePickup: boolean;
};

export function createGameSession(args: {
  level: LevelConfig;
  powers: PowersConfig;
  state?: GameState;
}): GameSession {
  const level = cloneLevel(args.level);
  const player = createPlayer(level);

  return {
    level,
    powers: args.powers,
    state: args.state ?? "ready",
    player,
    shooters: createShooters(level),
    bullets: [],
    letargo: createLetargoState(args.powers.letargo),
    presagio: createPresagioState(),
    presagioSegments: [],
    timePickup: createTimePickup(level, player),
    bonusTime: 0,
    pickupCollectEffects: [],
    dashEffects: [],
    elapsed: 0,
    lastDirection: { x: 0, y: -1 },
    playerTrail: [],
    playerTrailClock: 0,
    killingBullet: null,
    replayClock: 0,
    replayFrames: [],
    deathReplayFrames: [],
  };
}

export function setSessionLevel(
  session: GameSession,
  nextLevel: LevelConfig,
  nextState: GameState = "ready",
): void {
  session.level = cloneLevel(nextLevel);
  resetGameSession(session, nextState);
}

export function resetGameSession(
  session: GameSession,
  nextState: GameState = "running",
): void {
  session.state = nextState;
  session.player = createPlayer(session.level);
  session.shooters = createShooters(session.level);
  session.bullets = [];
  session.letargo = createLetargoState(session.powers.letargo);
  session.presagio = createPresagioState();
  session.presagioSegments = [];
  session.timePickup = createTimePickup(session.level, session.player);
  session.bonusTime = 0;
  session.pickupCollectEffects = [];
  session.dashEffects = [];
  session.elapsed = 0;
  session.lastDirection = { x: 0, y: -1 };
  session.playerTrail = [];
  session.playerTrailClock = 0;
  session.killingBullet = null;
  session.replayClock = 0;
  session.replayFrames = [];
  session.deathReplayFrames = [];
}

export function dashGameSession(session: GameSession, direction: Vec2): void {
  if (session.state !== "running") {
    return;
  }

  const from = { ...session.player.pos };

  session.player = applyDestello(
    session.player,
    activeDashDirection(session, direction),
    session.level,
    session.powers.destello,
  );

  session.dashEffects.push({
    from,
    to: { ...session.player.pos },
    age: 0,
  });
}

export function activatePresagioGameSession(session: GameSession): void {
  if (session.state !== "running") return;

  session.presagio = activatePresagio(
    session.presagio,
    session.powers.presagio,
  );

  session.presagioSegments = isPresagioActive(session.presagio)
    ? computePresagioSegments(session.bullets, session.level)
    : [];
}

export function getSessionScoreTime(session: GameSession): number {
  return session.elapsed + session.bonusTime;
}

export function updateGameSession(
  session: GameSession,
  args: {
    rawDt: number;
    direction: Vec2;
    slowHeld: boolean;
  },
): GameSessionUpdateResult {
  if (session.state !== "running") {
    return { died: false, collectedTimePickup: false };
  }

  const letargoStep = updateLetargo(
    session.letargo,
    args.slowHeld,
    args.rawDt,
    session.powers.letargo,
  );
  session.letargo = letargoStep.state;
  session.presagio = updatePresagio(session.presagio, args.rawDt);

  const dt = letargoStep.simulationDt;

  session.elapsed += dt;
  session.player = movePlayer(
    session.player,
    args.direction,
    dt,
    session.level,
  );

  if (isMoving(args.direction)) {
    session.lastDirection = args.direction;
  }

  const collectedTimePickup = collectSessionTimePickup(session);

  updateSessionEffects(session, args.rawDt);
  updateSessionTrail(session, args.rawDt);
  updateSessionShooters(session, dt);
  updateSessionBullets(session, dt);
  session.presagioSegments = isPresagioActive(session.presagio)
    ? computePresagioSegments(session.bullets, session.level)
    : [];
  recordSessionReplayFrame(session, args.rawDt);

  const killingBullet = session.bullets.find((bullet) =>
    circlesTouch(session.player, bullet),
  );

  if (killingBullet) {
    session.killingBullet = cloneBullet(killingBullet);
    session.deathReplayFrames = session.replayFrames.map(cloneReplayFrame);
    session.state = "dead";
    return { died: true, collectedTimePickup };
  }

  return { died: false, collectedTimePickup };
}

function recordSessionReplayFrame(session: GameSession, rawDt: number): void {
  session.replayClock += rawDt;
  session.replayFrames.push(
    cloneReplayFrame({
      time: session.replayClock,
      player: session.player,
      bullets: session.bullets,
      timePickup: session.timePickup,
    }),
  );

  const oldestAllowed = session.replayClock - replayWindowSeconds;
  session.replayFrames = session.replayFrames.filter(
    (frame) => frame.time >= oldestAllowed,
  );
}

function collectSessionTimePickup(session: GameSession): boolean {
  if (!playerCollectsTimePickup(session.player, session.timePickup)) {
    return false;
  }

  session.bonusTime += session.timePickup.value;
  session.pickupCollectEffects.push({
    pos: { ...session.timePickup.pos },
    value: session.timePickup.value,
    age: 0,
  });
  session.timePickup = createTimePickup(session.level, session.player);

  return true;
}

function updateSessionEffects(session: GameSession, rawDt: number): void {
  session.pickupCollectEffects = session.pickupCollectEffects
    .map((effect) => ({ ...effect, age: effect.age + rawDt }))
    .filter((effect) => effect.age < pickupEffectLifetime);

  session.dashEffects = session.dashEffects
    .map((effect) => ({ ...effect, age: effect.age + rawDt }))
    .filter((effect) => effect.age < dashEffectLifetime);
}

function updateSessionTrail(session: GameSession, rawDt: number): void {
  const nextTrail = updateLetargoTrail({
    trail: session.playerTrail,
    clock: session.playerTrailClock,
    player: session.player,
    rawDt,
    active: session.letargo.active,
    config: session.powers.letargo,
  });

  session.playerTrail = nextTrail.trail;
  session.playerTrailClock = nextTrail.clock;
}

function updateSessionShooters(session: GameSession, dt: number): void {
  for (const shooter of session.shooters) {
    shooter.elapsed += dt;

    while (shooter.elapsed >= shooter.cooldown) {
      shooter.elapsed -= shooter.cooldown;

      if (session.bullets.length < session.level.bullets.max) {
        session.bullets.push(
          spawnBullet(shooter, session.player.pos, session.level),
        );
      }
    }
  }
}

function updateSessionBullets(session: GameSession, dt: number): void {
  session.bullets = session.bullets.map((bullet) =>
    moveBullet(bullet, dt, session.level),
  );
}

function activeDashDirection(session: GameSession, direction: Vec2): Vec2 {
  if (isMoving(direction)) {
    session.lastDirection = direction;
    return direction;
  }

  return session.lastDirection;
}

function isMoving(direction: Vec2): boolean {
  return direction.x !== 0 || direction.y !== 0;
}

function cloneReplayFrame(frame: ReplayFrame): ReplayFrame {
  return {
    time: frame.time,
    player: clonePlayer(frame.player),
    bullets: frame.bullets.map(cloneBullet),
    timePickup: frame.timePickup
      ? {
          ...frame.timePickup,
          pos: { ...frame.timePickup.pos },
        }
      : null,
  };
}

function clonePlayer(player: Player): Player {
  return {
    ...player,
    pos: { ...player.pos },
  };
}

function cloneBullet(bullet: Bullet): Bullet {
  return {
    ...bullet,
    pos: { ...bullet.pos },
    vel: { ...bullet.vel },
  };
}
