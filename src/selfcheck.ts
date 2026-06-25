import assert from "node:assert/strict";
import { CONFIG, circlesTouch, createPlayer, createShooter, moveBullet, movePlayer, spawnBullet } from "./core.ts";

const player = createPlayer();
const moved = movePlayer(player, { x: -1, y: -1 }, 10);
assert.equal(moved.pos.x, CONFIG.playerRadius);
assert.equal(moved.pos.y, CONFIG.playerRadius);

const bounced = moveBullet(
  {
    pos: { x: CONFIG.width - CONFIG.bulletRadius - 1, y: CONFIG.height / 2 },
    vel: { x: 180, y: 0 },
    radius: CONFIG.bulletRadius,
  },
  1,
);
assert.equal(bounced.pos.x, CONFIG.width - CONFIG.bulletRadius);
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

const shot = spawnBullet(createShooter(), { x: CONFIG.width / 2, y: CONFIG.height / 2 });
assert.ok(Math.abs(Math.hypot(shot.vel.x, shot.vel.y) - CONFIG.bulletSpeed) < 0.000001);
assert.equal(shot.vel.x, 0);
assert.ok(shot.vel.y > 0);

console.log("selfcheck passed");
