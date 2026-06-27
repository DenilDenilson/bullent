import type {
  Bullet,
  GameState,
  LevelConfig,
  Player,
  Shooter,
  Vec2,
} from "./core.ts";
import type { PageMode } from "./mode.ts";
import type { TimePickup } from "./pickups.ts";
import type { LetargoTrailPoint } from "./powers/letargo.ts";
import type { PresagioSegment } from "./powers/presagio.ts";
import type { DashEffect, PickupCollectEffect } from "./session.ts";
import { formatTime } from "./utils.ts";

export type ResizeGameCanvasArgs = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  shell: HTMLElement;
  level: LevelConfig;
  mode: PageMode;
};

export type RenderGameArgs = {
  ctx: CanvasRenderingContext2D;
  level: LevelConfig;
  mode: PageMode;
  state: GameState;
  player: Player;
  shooters: Shooter[];
  bullets: Bullet[];
  playerTrail: LetargoTrailPoint[];
  presagioSegments: PresagioSegment[];
  timePickup: TimePickup | null;
  pickupCollectEffects: PickupCollectEffect[];
  dashEffects: DashEffect[];
  trailLifetime: number;
  elapsed: number;
  bestTime: number;
  loadError: string;
};

export function resizeGameCanvas({
  canvas,
  ctx,
  shell,
  level,
  mode,
}: ResizeGameCanvasArgs): void {
  const ratio = window.devicePixelRatio || 1;
  const mobileControlsHeight = Math.min(
    240,
    Math.max(176, window.innerHeight * 0.26),
  );
  const mobileAvailableHeight = Math.max(
    360,
    window.innerHeight - (96 + mobileControlsHeight),
  );

  const mobileWidth = Math.max(
    280,
    Math.min(
      620,
      window.innerWidth - 24,
      mobileAvailableHeight * (level.arena.width / level.arena.height),
    ),
  );

  const scale = mode === "mobile" ? mobileWidth / level.arena.width : 1;

  const shellWidth =
    mode === "embed"
      ? `min(${level.arena.width}px, 100vw)`
      : mode === "mobile"
        ? `${mobileWidth}px`
        : `min(${level.arena.width}px, calc(100vw - 32px))`;

  document.body.style.setProperty("--mobile-game-width", `${mobileWidth}px`);

  canvas.width = Math.round(level.arena.width * ratio * scale);
  canvas.height = Math.round(level.arena.height * ratio * scale);

  shell.style.width = shellWidth;
  shell.style.aspectRatio = `${level.arena.width} / ${level.arena.height}`;

  canvas.style.width = shellWidth;
  canvas.style.aspectRatio = `${level.arena.width} / ${level.arena.height}`;

  ctx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
}

export function renderGame(args: RenderGameArgs): void {
  const {
    ctx,
    level,
    mode,
    state,
    player,
    shooters,
    bullets,
    playerTrail,
    presagioSegments,
    timePickup,
    pickupCollectEffects,
    dashEffects,
    trailLifetime,
    elapsed,
    bestTime,
    loadError,
  } = args;

  ctx.clearRect(0, 0, level.arena.width, level.arena.height);

  const gradient = ctx.createLinearGradient(
    0,
    0,
    level.arena.width,
    level.arena.height,
  );
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.55, "#18181b");
  gradient.addColorStop(1, "#052e2b");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, level.arena.width, level.arena.height);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, level.arena.width - 2, level.arena.height - 2);

  if (mode !== "mobile") {
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "600 14px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`Time ${formatTime(elapsed)}`, 18, 16);
    ctx.fillText(level.name, 18, 36);

    ctx.textAlign = "right";
    ctx.fillText(`Best ${formatTime(bestTime)}`, level.arena.width - 18, 16);
    ctx.fillText(`Bullets ${bullets.length}`, level.arena.width - 18, 36);
  }

  for (const shooter of shooters) {
    drawShooter(ctx, shooter, player.pos);
  }

  drawTimePickup(ctx, timePickup, elapsed);
  drawPickupCollectEffects(ctx, pickupCollectEffects);

  drawPlayerTrail(ctx, playerTrail, trailLifetime);
  drawDashEffects(ctx, dashEffects);
  drawCircle(ctx, player.pos, player.radius, "#a78bfa", "#c4b5fd");

  drawPresagioSegments(ctx, presagioSegments);

  for (const bullet of bullets) {
    drawCircle(ctx, bullet.pos, bullet.radius, "#22d3ee", "#67e8f9");
  }

  if (state !== "running") {
    ctx.fillStyle = "rgb(2 6 23 / 0.58)";
    ctx.fillRect(0, 0, level.arena.width, level.arena.height);
    drawCircle(ctx, player.pos, player.radius, "#a78bfa", "#c4b5fd");
    drawText(ctx, {
      level,
      state,
      elapsed,
      bestTime,
      loadError,
    });
  }
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  pos: Vec2,
  radius: number,
  fill: string,
  shadow = "transparent",
): void {
  ctx.save();
  ctx.shadowBlur = shadow === "transparent" ? 0 : 18;
  ctx.shadowColor = shadow;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShooter(
  ctx: CanvasRenderingContext2D,
  shooter: Shooter,
  target: Vec2,
): void {
  const angle = Math.atan2(target.y - shooter.pos.y, target.x - shooter.pos.x);
  const size = 15;

  ctx.save();
  ctx.translate(shooter.pos.x, shooter.pos.y);
  ctx.rotate(angle);
  ctx.shadowBlur = 18;
  ctx.shadowColor = "#fb923c";
  ctx.fillStyle = "#f97316";
  ctx.strokeStyle = "#fed7aa";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.72, -size * 0.74);
  ctx.lineTo(-size * 0.42, 0);
  ctx.lineTo(-size * 0.72, size * 0.74);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDashEffects(
  ctx: CanvasRenderingContext2D,
  effects: DashEffect[],
): void {
  for (const effect of effects) {
    const progress = Math.min(1, effect.age / 0.26);
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.globalAlpha = alpha * 0.85;
    ctx.lineWidth = 7 * (1 - progress) + 1.5;
    ctx.strokeStyle = "#c4b5fd";
    ctx.shadowBlur = 24;
    ctx.shadowColor = "#a78bfa";
    ctx.beginPath();
    ctx.moveTo(effect.from.x, effect.from.y);
    ctx.lineTo(effect.to.x, effect.to.y);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = "#f5f3ff";
    ctx.beginPath();
    ctx.arc(effect.to.x, effect.to.y, 12 + progress * 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPickupCollectEffects(
  ctx: CanvasRenderingContext2D,
  effects: PickupCollectEffect[],
): void {
  for (const effect of effects) {
    const progress = Math.min(1, effect.age / 0.7);
    const alpha = Math.max(0, 1 - progress);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 28;
    ctx.shadowColor = "#facc15";
    ctx.strokeStyle = "#fde68a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.pos.x, effect.pos.y, 14 + progress * 30, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#fef3c7";
    ctx.font = "800 15px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `+${effect.value}s`,
      effect.pos.x,
      effect.pos.y - 20 - progress * 26,
    );
    ctx.restore();
  }
}

function drawPlayerTrail(
  ctx: CanvasRenderingContext2D,
  playerTrail: LetargoTrailPoint[],
  trailLifetime: number,
): void {
  for (const point of playerTrail) {
    const progress = point.age / trailLifetime;
    const alpha = Math.max(0, 1 - progress) * 0.34;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#5eead4";
    ctx.fillStyle = "#a7f3d0";
    ctx.beginPath();
    ctx.arc(
      point.pos.x,
      point.pos.y,
      point.radius * (1 + progress * 0.8),
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }
}

function drawTimePickup(
  ctx: CanvasRenderingContext2D,
  pickup: TimePickup | null,
  elapsed: number,
): void {
  if (!pickup) {
    return;
  }

  const pulse = 1 + Math.sin(elapsed * 5) * 0.08;

  ctx.save();
  ctx.translate(pickup.pos.x, pickup.pos.y);
  ctx.rotate(Math.PI / 4);
  ctx.scale(pulse, pulse);
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#facc15";
  ctx.fillStyle = "#facc15";
  ctx.strokeStyle = "#fef9c3";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(-pickup.radius, -pickup.radius, pickup.radius * 2, pickup.radius * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgb(254 249 195 / 0.92)";
  ctx.font = "700 10px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`+${pickup.value}`, pickup.pos.x, pickup.pos.y);
  ctx.restore();
}

function drawPresagioSegments(
  ctx: CanvasRenderingContext2D,
  segments: PresagioSegment[],
): void {
  if (segments.length === 0) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgb(222 16 95 / 0.72)";
  ctx.shadowBlur = 16;
  ctx.shadowColor = "#e617ca";
  ctx.setLineDash([8, 8]);

  for (const segment of segments) {
    ctx.beginPath();
    ctx.moveTo(segment.from.x, segment.from.y);
    ctx.lineTo(segment.to.x, segment.to.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(segment.to.x, segment.to.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "rgb(236 254 255 / 0.92)";
    ctx.fill();
  }

  ctx.restore();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  args: {
    level: LevelConfig;
    state: GameState;
    elapsed: number;
    bestTime: number;
    loadError: string;
  },
): void {
  const { level, state, elapsed, bestTime, loadError } = args;

  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 24px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (loadError) {
    ctx.fillText(
      "Level load failed",
      level.arena.width / 2,
      level.arena.height / 2,
    );
    ctx.font = "600 14px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(loadError, level.arena.width / 2, level.arena.height / 2 + 28);
    return;
  }

  if (state === "ready") {
    ctx.fillText(
      "Click / Enter to start",
      level.arena.width / 2,
      level.arena.height / 2 + 58,
    );
    return;
  }

  if (state === "dead") {
    ctx.fillText(
      `Survived ${formatTime(elapsed)}`,
      level.arena.width / 2,
      level.arena.height / 2 + 42,
    );
    ctx.font = "600 16px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(
      `Best ${formatTime(bestTime)} · Restart?`,
      level.arena.width / 2,
      level.arena.height / 2 + 72,
    );
  }
}
