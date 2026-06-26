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
import { cloneLevel } from "./utils.ts";

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
  elapsed: number;
  lastDirection: Vec2;
  playerTrail: LetargoTrailPoint[];
  playerTrailClock: number;
};

export type GameSessionUpdateResult = {
  died: boolean;
};

export function createGameSession(args: {
  level: LevelConfig;
  powers: PowersConfig;
  state?: GameState;
}): GameSession {
  const level = cloneLevel(args.level);

  return {
    level,
    powers: args.powers,
    state: args.state ?? "ready",
    player: createPlayer(level),
    shooters: createShooters(level),
    bullets: [],
    letargo: createLetargoState(args.powers.letargo),
    presagio: createPresagioState(),
    presagioSegments: [],
    elapsed: 0,
    lastDirection: { x: 0, y: -1 },
    playerTrail: [],
    playerTrailClock: 0,
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
  session.elapsed = 0;
  session.lastDirection = { x: 0, y: -1 };
  session.playerTrail = [];
  session.playerTrailClock = 0;
}

export function dashGameSession(session: GameSession, direction: Vec2): void {
  if (session.state !== "running") {
    return;
  }

  session.player = applyDestello(
    session.player,
    activeDashDirection(session, direction),
    session.level,
    session.powers.destello,
  );
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

export function updateGameSession(
  session: GameSession,
  args: {
    rawDt: number;
    direction: Vec2;
    slowHeld: boolean;
  },
): GameSessionUpdateResult {
  if (session.state !== "running") {
    return { died: false };
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

  updateSessionTrail(session, args.rawDt);
  updateSessionShooters(session, dt);
  updateSessionBullets(session, dt);
  session.presagioSegments = isPresagioActive(session.presagio)
    ? computePresagioSegments(session.bullets, session.level)
    : [];

  if (session.bullets.some((bullet) => circlesTouch(session.player, bullet))) {
    session.state = "dead";
    return { died: true };
  }

  return { died: false };
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
