export type Vec2 = {
  x: number;
  y: number;
};

export type GameState = "ready" | "running" | "dead" | "won";

export type Player = {
  pos: Vec2;
  radius: number;
  speed: number;
};

export type Bullet = {
  pos: Vec2;
  vel: Vec2;
  radius: number;
};

export type Shooter = {
  pos: Vec2;
  cooldown: number;
  elapsed: number;
};

export type GameConfig = {
  width: number;
  height: number;
  levelDuration: number;
  playerRadius: number;
  playerSpeed: number;
  bulletRadius: number;
  bulletSpeed: number;
  shooterCooldown: number;
  maxBullets: number;
};

export const CONFIG: GameConfig = {
  width: 460,
  height: 560,
  levelDuration: 30,
  playerRadius: 10,
  playerSpeed: 220,
  bulletRadius: 5,
  bulletSpeed: 180,
  shooterCooldown: 0.9,
  maxBullets: 80,
};

export function createPlayer(config: GameConfig = CONFIG): Player {
  return {
    pos: { x: config.width / 2, y: config.height / 2 },
    radius: config.playerRadius,
    speed: config.playerSpeed,
  };
}

export function createShooter(config: GameConfig = CONFIG): Shooter {
  return {
    pos: { x: config.width / 2, y: 28 },
    cooldown: config.shooterCooldown,
    elapsed: 0,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function movePlayer(player: Player, direction: Vec2, dt: number, config: GameConfig = CONFIG): Player {
  const length = Math.hypot(direction.x, direction.y);
  const input = length > 0 ? { x: direction.x / length, y: direction.y / length } : { x: 0, y: 0 };

  return {
    ...player,
    pos: {
      x: clamp(player.pos.x + input.x * player.speed * dt, player.radius, config.width - player.radius),
      y: clamp(player.pos.y + input.y * player.speed * dt, player.radius, config.height - player.radius),
    },
  };
}

export function spawnBullet(shooter: Shooter, target: Vec2, config: GameConfig = CONFIG): Bullet {
  const dx = target.x - shooter.pos.x;
  const dy = target.y - shooter.pos.y;
  const length = Math.hypot(dx, dy) || 1;

  return {
    pos: { ...shooter.pos },
    vel: {
      x: (dx / length) * config.bulletSpeed,
      y: (dy / length) * config.bulletSpeed,
    },
    radius: config.bulletRadius,
  };
}

export function moveBullet(bullet: Bullet, dt: number, config: GameConfig = CONFIG): Bullet {
  const next: Bullet = {
    ...bullet,
    pos: {
      x: bullet.pos.x + bullet.vel.x * dt,
      y: bullet.pos.y + bullet.vel.y * dt,
    },
    vel: { ...bullet.vel },
  };

  if (next.pos.x < next.radius || next.pos.x > config.width - next.radius) {
    next.pos.x = clamp(next.pos.x, next.radius, config.width - next.radius);
    next.vel.x *= -1;
  }

  if (next.pos.y < next.radius || next.pos.y > config.height - next.radius) {
    next.pos.y = clamp(next.pos.y, next.radius, config.height - next.radius);
    next.vel.y *= -1;
  }

  return next;
}

export function circlesTouch(a: { pos: Vec2; radius: number }, b: { pos: Vec2; radius: number }): boolean {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y) <= a.radius + b.radius;
}
