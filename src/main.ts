import "./style.css";
import {
  CONFIG,
  type Bullet,
  type GameState,
  type Player,
  type Shooter,
  type Vec2,
  circlesTouch,
  createPlayer,
  createShooter,
  moveBullet,
  movePlayer,
  spawnBullet,
} from "./core.ts";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
function requireValue<T>(value: T | null, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

const gameCanvas = requireValue(canvas, "Missing #game canvas");
const ctx = requireValue(gameCanvas.getContext("2d"), "Canvas 2D is not supported");

const keys = new Set<string>();

let state: GameState = "ready";
let player: Player = createPlayer();
let shooter: Shooter = createShooter();
let bullets: Bullet[] = [];
let remaining = CONFIG.levelDuration;
let lastTime = performance.now();

function reset(nextState: GameState = "running"): void {
  state = nextState;
  player = createPlayer();
  shooter = createShooter();
  bullets = [];
  remaining = CONFIG.levelDuration;
}

function startOrRestart(): void {
  if (state !== "running") {
    reset("running");
  }
}

function inputDirection(): Vec2 {
  return {
    x: Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a")),
    y: Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w")),
  };
}

function update(dt: number): void {
  if (state !== "running") {
    return;
  }

  remaining = Math.max(0, remaining - dt);
  if (remaining <= 0) {
    state = "won";
    return;
  }

  player = movePlayer(player, inputDirection(), dt);

  shooter.elapsed += dt;
  while (shooter.elapsed >= shooter.cooldown) {
    shooter.elapsed -= shooter.cooldown;
    if (bullets.length < CONFIG.maxBullets) {
      bullets.push(spawnBullet(shooter, player.pos));
    }
  }

  bullets = bullets.map((bullet) => moveBullet(bullet, dt));

  if (bullets.some((bullet) => circlesTouch(player, bullet))) {
    state = "dead";
  }
}

function resizeCanvas(): void {
  const ratio = window.devicePixelRatio || 1;
  gameCanvas.width = CONFIG.width * ratio;
  gameCanvas.height = CONFIG.height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawCircle(pos: Vec2, radius: number, fill: string, shadow = "transparent"): void {
  ctx.save();
  ctx.shadowBlur = shadow === "transparent" ? 0 : 18;
  ctx.shadowColor = shadow;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawText(): void {
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 24px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (state === "ready") {
    ctx.fillText("Click / Enter to start", CONFIG.width / 2, CONFIG.height / 2 + 58);
  } else if (state === "dead") {
    ctx.fillText("Hit. Restart?", CONFIG.width / 2, CONFIG.height / 2 + 58);
  } else if (state === "won") {
    ctx.fillText("Survived. Again?", CONFIG.width / 2, CONFIG.height / 2 + 58);
  }
}

function render(): void {
  ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

  const gradient = ctx.createLinearGradient(0, 0, CONFIG.width, CONFIG.height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.55, "#18181b");
  gradient.addColorStop(1, "#052e2b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, CONFIG.width - 2, CONFIG.height - 2);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 14px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Time ${Math.ceil(remaining).toString().padStart(2, "0")}`, 18, 16);

  ctx.textAlign = "right";
  ctx.fillText(`Bullets ${bullets.length}`, CONFIG.width - 18, 16);

  drawCircle(shooter.pos, 12, "#f97316", "#fb923c");
  drawCircle(player.pos, player.radius, "#a78bfa", "#c4b5fd");
  for (const bullet of bullets) {
    drawCircle(bullet.pos, bullet.radius, "#22d3ee", "#67e8f9");
  }

  if (state !== "running") {
    ctx.fillStyle = "rgb(2 6 23 / 0.58)";
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    drawCircle(player.pos, player.radius, "#a78bfa", "#c4b5fd");
    drawText();
  }
}

function frame(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].includes(key)) {
    event.preventDefault();
  }
  if (key === "enter" || key === " " || key === "spacebar") {
    startOrRestart();
  }
  keys.add(key);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

gameCanvas.addEventListener("pointerdown", () => {
  gameCanvas.focus();
  startOrRestart();
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
render();
requestAnimationFrame(frame);
