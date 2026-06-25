import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LEVEL,
  DEFAULT_POWERS,
  circlesTouch,
  createSlowMotionState,
  createPlayer,
  createShooters,
  moveBullet,
  movePlayer,
  parseLevelFile,
  parsePowersConfig,
  spawnBullet,
  updateSlowMotion,
} from "./core.ts";

const levelFile = parseLevelFile(JSON.parse(readFileSync("public/levels.json", "utf8")));
assert.equal(levelFile.version, 1);
assert.equal(levelFile.levels.length, 1);

const powers = parsePowersConfig(JSON.parse(readFileSync("public/powers.json", "utf8")));
assert.equal(powers.slowMotion.maxEnergy, DEFAULT_POWERS.slowMotion.maxEnergy);

const player = createPlayer();
const moved = movePlayer(player, { x: -1, y: -1 }, 10);
assert.equal(moved.pos.x, DEFAULT_LEVEL.player.radius);
assert.equal(moved.pos.y, DEFAULT_LEVEL.player.radius);

const dashed = movePlayer(player, { x: 1, y: 0 }, 72 / player.speed);
assert.equal(dashed.pos.x, player.pos.x + 72);
assert.equal(dashed.pos.y, player.pos.y);

const bounced = moveBullet(
  {
    pos: { x: DEFAULT_LEVEL.arena.width - DEFAULT_LEVEL.bullets.radius - 1, y: DEFAULT_LEVEL.arena.height / 2 },
    vel: { x: 180, y: 0 },
    radius: DEFAULT_LEVEL.bullets.radius,
  },
  1,
);
assert.equal(bounced.pos.x, DEFAULT_LEVEL.arena.width - DEFAULT_LEVEL.bullets.radius);
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
const shot = spawnBullet(shooter, { x: DEFAULT_LEVEL.arena.width / 2, y: DEFAULT_LEVEL.arena.height / 2 });
assert.ok(Math.abs(Math.hypot(shot.vel.x, shot.vel.y) - DEFAULT_LEVEL.bullets.speed) < 0.000001);
assert.equal(shot.vel.x, 0);
assert.ok(shot.vel.y > 0);

let slow = updateSlowMotion(createSlowMotionState(), true, 1);
assert.equal(slow.simulationDt, DEFAULT_POWERS.slowMotion.timeScale);
assert.equal(slow.state.energy, 2);

slow = updateSlowMotion(slow.state, false, 1);
assert.equal(slow.simulationDt, 1);
assert.equal(slow.state.energy, DEFAULT_POWERS.slowMotion.maxEnergy);

slow = updateSlowMotion(createSlowMotionState(), true, DEFAULT_POWERS.slowMotion.maxEnergy);
assert.equal(slow.state.energy, 0);
assert.equal(slow.state.cooldownRemaining, DEFAULT_POWERS.slowMotion.cooldown);

slow = updateSlowMotion(slow.state, false, DEFAULT_POWERS.slowMotion.cooldown);
assert.equal(slow.state.energy, DEFAULT_POWERS.slowMotion.maxEnergy);
assert.equal(slow.state.cooldownRemaining, 0);

console.log("selfcheck passed");
