import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
import { parsePowersConfig } from "./powers/index.ts";

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

console.log("selfcheck passed");
