import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { botDashSurvives, chooseBotDirection, thinkBot } from "./bot.ts";
import {
  DEFAULT_LEVEL,
  circlesTouch,
  createPlayer,
  createShooters,
  moveBullet,
  movePlayer,
  parseLevelFile,
  spawnBullet,
} from "./core.ts";
import { applyDestello } from "./powers/destello.ts";
import { createLetargoState, updateLetargo } from "./powers/letargo.ts";
import {
  activatePresagio,
  computePresagioSegments,
  createPresagioState,
  updatePresagio,
} from "./powers/presagio.ts";
import { parsePowersConfig } from "./powers/index.ts";
import { TIME_PICKUP_BONUS_SECONDS } from "./pickups.ts";
import {
  activatePresagioGameSession,
  createGameSession,
  dashGameSession,
  getSessionScoreTime,
  resetGameSession,
  updateGameSession,
} from "./session.ts";

const levelFile = parseLevelFile(
  JSON.parse(readFileSync("public/levels.json", "utf8")),
);
assert.equal(levelFile.version, 1);
assert.equal(levelFile.levels.length, 1);

const powers = parsePowersConfig(
  JSON.parse(readFileSync("public/powers.json", "utf8")),
);
assert.equal(powers.destello.distance, 72);
assert.equal(powers.letargo.maxEnergy, 3);
assert.equal(powers.letargo.visual.trailLifetime, 0.45);
assert.equal(powers.presagio.cooldown, 2);
assert.equal(powers.presagio.duration, 0.85);

const player = createPlayer();

const moved = movePlayer(player, { x: -1, y: -1 }, 10);
assert.equal(moved.pos.x, DEFAULT_LEVEL.player.radius);
assert.equal(moved.pos.y, DEFAULT_LEVEL.player.radius);

const dashed = applyDestello(
  player,
  { x: 1, y: 0 },
  DEFAULT_LEVEL,
  powers.destello,
);
assert.equal(dashed.pos.x, player.pos.x + powers.destello.distance);
assert.equal(dashed.pos.y, player.pos.y);

const bounced = moveBullet(
  {
    pos: {
      x: DEFAULT_LEVEL.arena.width - DEFAULT_LEVEL.bullets.radius - 1,
      y: DEFAULT_LEVEL.arena.height / 2,
    },
    vel: { x: 180, y: 0 },
    radius: DEFAULT_LEVEL.bullets.radius,
  },
  1,
);
assert.equal(
  bounced.pos.x,
  DEFAULT_LEVEL.arena.width - DEFAULT_LEVEL.bullets.radius,
);
assert.equal(bounced.vel.x, -180);

assert.equal(
  circlesTouch(
    { pos: { x: 10, y: 10 }, radius: 10 },
    { pos: { x: 29, y: 10 }, radius: 10 },
  ),
  true,
);

assert.equal(
  circlesTouch(
    { pos: { x: 10, y: 10 }, radius: 10 },
    { pos: { x: 31, y: 10 }, radius: 10 },
  ),
  false,
);

const [shooter] = createShooters();
assert.ok(shooter);

const shot = spawnBullet(shooter, {
  x: DEFAULT_LEVEL.arena.width / 2,
  y: DEFAULT_LEVEL.arena.height / 2,
});
assert.ok(
  Math.abs(Math.hypot(shot.vel.x, shot.vel.y) - DEFAULT_LEVEL.bullets.speed) <
    0.000001,
);
assert.equal(shot.vel.x, 0);
assert.ok(shot.vel.y > 0);

let letargoStep = updateLetargo(
  createLetargoState(powers.letargo),
  true,
  1,
  powers.letargo,
);
assert.equal(letargoStep.simulationDt, powers.letargo.timeScale);
assert.equal(letargoStep.state.energy, powers.letargo.maxEnergy - 1);

letargoStep = updateLetargo(letargoStep.state, false, 1, powers.letargo);
assert.equal(letargoStep.simulationDt, 1);
assert.equal(letargoStep.state.energy, powers.letargo.maxEnergy);

letargoStep = updateLetargo(
  createLetargoState(powers.letargo),
  true,
  powers.letargo.maxEnergy,
  powers.letargo,
);
assert.equal(letargoStep.state.energy, 0);
assert.equal(letargoStep.state.cooldownRemaining, powers.letargo.cooldown);

letargoStep = updateLetargo(
  letargoStep.state,
  false,
  powers.letargo.cooldown,
  powers.letargo,
);
assert.equal(letargoStep.state.energy, powers.letargo.maxEnergy);
assert.equal(letargoStep.state.cooldownRemaining, 0);

let presagio = createPresagioState();

assert.equal(presagio.activeRemaining, 0);
assert.equal(presagio.cooldownRemaining, 0);

presagio = activatePresagio(presagio, {
  cooldown: 2,
  duration: 0.85,
});

assert.equal(presagio.activeRemaining, 0.85);
assert.equal(presagio.cooldownRemaining, 2);

presagio = updatePresagio(presagio, 0.5);

assert.ok(Math.abs(presagio.activeRemaining - 0.35) < 0.000001);
assert.equal(presagio.cooldownRemaining, 1.5);

const presagioSegments = computePresagioSegments(
  [
    {
      pos: { x: 100, y: 100 },
      vel: { x: 180, y: 0 },
      radius: DEFAULT_LEVEL.bullets.radius,
    },
  ],
  DEFAULT_LEVEL,
);

assert.equal(presagioSegments.length, 1);
assert.equal(
  presagioSegments[0]?.to.x,
  DEFAULT_LEVEL.arena.width - DEFAULT_LEVEL.bullets.radius,
);
assert.equal(presagioSegments[0]?.to.y, 100);

const session = createGameSession({
  level: DEFAULT_LEVEL,
  powers,
  state: "ready",
});

assert.equal(session.state, "ready");
assert.equal(session.elapsed, 0);
assert.equal(session.bullets.length, 0);

resetGameSession(session, "running");
assert.equal(session.state, "running");
assert.equal(session.elapsed, 0);

const beforeDashX = session.player.pos.x;
dashGameSession(session, { x: 1, y: 0 });
assert.equal(session.player.pos.x, beforeDashX + powers.destello.distance);

const updateResult = updateGameSession(session, {
  rawDt: 1,
  direction: { x: 0, y: 0 },
  slowHeld: false,
});

activatePresagioGameSession(session);

assert.equal(session.presagio.cooldownRemaining, powers.presagio.cooldown);
assert.ok(session.presagio.activeRemaining > 0);
assert.ok(Array.isArray(session.presagioSegments));

assert.equal(updateResult.died, false);
assert.equal(updateResult.collectedTimePickup, false);
assert.equal(session.elapsed, 1);

const pickupSession = createGameSession({
  level: DEFAULT_LEVEL,
  powers,
  state: "running",
});

pickupSession.timePickup = {
  pos: { ...pickupSession.player.pos },
  radius: 12,
  value: TIME_PICKUP_BONUS_SECONDS,
};

const pickupResult = updateGameSession(pickupSession, {
  rawDt: 0,
  direction: { x: 0, y: 0 },
  slowHeld: false,
});

assert.equal(pickupResult.died, false);
assert.equal(pickupResult.collectedTimePickup, true);
assert.equal(pickupSession.bonusTime, TIME_PICKUP_BONUS_SECONDS);
assert.equal(getSessionScoreTime(pickupSession), TIME_PICKUP_BONUS_SECONDS);

const botSession = createGameSession({
  level: DEFAULT_LEVEL,
  powers,
  state: "running",
});

botSession.timePickup = {
  pos: {
    x: botSession.player.pos.x + 100,
    y: botSession.player.pos.y,
  },
  radius: 12,
  value: TIME_PICKUP_BONUS_SECONDS,
};

const botDirection = chooseBotDirection(botSession);
assert.equal(botDirection.x, 1);
assert.equal(botDirection.y, 0);

const botInput = thinkBot(botSession);
assert.equal(botInput.direction.x, 1);
assert.equal(botInput.direction.y, 0);
assert.equal(botInput.slowHeld, false);
assert.equal(botInput.useDash, false);
assert.equal(botInput.usePresagio, false);

botSession.bullets = [
  {
    pos: {
      x: botSession.player.pos.x + 34,
      y: botSession.player.pos.y,
    },
    vel: { x: -180, y: 0 },
    radius: DEFAULT_LEVEL.bullets.radius,
  },
];

const dangerAwareBotDirection = chooseBotDirection(botSession);
assert.notEqual(dangerAwareBotDirection.x, 1);

const dashSafetySession = createGameSession({
  level: DEFAULT_LEVEL,
  powers,
  state: "running",
});
const unsafeDashDirection = { x: 1, y: 0 };
const unsafeDashLanding = applyDestello(
  dashSafetySession.player,
  unsafeDashDirection,
  DEFAULT_LEVEL,
  powers.destello,
);
assert.equal(botDashSurvives(dashSafetySession, unsafeDashDirection), true);
dashSafetySession.bullets = [
  {
    pos: { ...unsafeDashLanding.pos },
    vel: { x: 0, y: 0 },
    radius: DEFAULT_LEVEL.bullets.radius,
  },
];
assert.equal(botDashSurvives(dashSafetySession, unsafeDashDirection), false);

const deathSession = createGameSession({
  level: DEFAULT_LEVEL,
  powers,
  state: "running",
});

dashGameSession(deathSession, { x: 1, y: 0 });
deathSession.bullets = [
  {
    pos: { ...deathSession.player.pos },
    vel: { x: 180, y: 0 },
    radius: DEFAULT_LEVEL.bullets.radius,
  },
];
activatePresagioGameSession(deathSession);

const deathResult = updateGameSession(deathSession, {
  rawDt: 1 / 60,
  direction: { x: 0, y: 0 },
  slowHeld: false,
});

const finalReplayFrame = deathSession.deathReplayFrames.at(-1);

assert.equal(deathResult.died, true);
assert.ok(deathSession.killingBullet);
assert.ok(deathSession.replayFrames.length > 0);
assert.ok(deathSession.deathReplayFrames.length > 0);

if (!finalReplayFrame) {
  throw new Error("Expected a final death replay frame");
}

assert.ok(finalReplayFrame.dashEffects.length > 0);
assert.ok(finalReplayFrame.presagioSegments.length > 0);

console.log(":) selfcheck passed!");
