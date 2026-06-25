import "./style.css";
import {
  DEFAULT_LEVEL,
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
  parseLevelFile,
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
const gameShell = requireValue(document.querySelector<HTMLElement>("#game-shell"), "Missing #game-shell");
const settingsToggle = requireValue(document.querySelector<HTMLButtonElement>("#settings-toggle"), "Missing #settings-toggle");
const settingsPanel = requireValue(document.querySelector<HTMLFormElement>("#settings-panel"), "Missing #settings-panel");
const settingsClose = requireValue(document.querySelector<HTMLButtonElement>("#settings-close"), "Missing #settings-close");
const addShooterButton = requireValue(document.querySelector<HTMLButtonElement>("#add-shooter"), "Missing #add-shooter");
const resetSettingsButton = requireValue(document.querySelector<HTMLButtonElement>("#reset-settings"), "Missing #reset-settings");
const cancelSettingsButton = requireValue(document.querySelector<HTMLButtonElement>("#cancel-settings"), "Missing #cancel-settings");
const shootersList = requireValue(document.querySelector<HTMLElement>("#shooters-list"), "Missing #shooters-list");
const settingsError = requireValue(document.querySelector<HTMLElement>("#settings-error"), "Missing #settings-error");

const inputs = {
  name: requireValue(document.querySelector<HTMLInputElement>("#level-name"), "Missing #level-name"),
  arenaWidth: requireValue(document.querySelector<HTMLInputElement>("#arena-width"), "Missing #arena-width"),
  arenaHeight: requireValue(document.querySelector<HTMLInputElement>("#arena-height"), "Missing #arena-height"),
  playerRadius: requireValue(document.querySelector<HTMLInputElement>("#player-radius"), "Missing #player-radius"),
  playerSpeed: requireValue(document.querySelector<HTMLInputElement>("#player-speed"), "Missing #player-speed"),
  bulletRadius: requireValue(document.querySelector<HTMLInputElement>("#bullet-radius"), "Missing #bullet-radius"),
  bulletSpeed: requireValue(document.querySelector<HTMLInputElement>("#bullet-speed"), "Missing #bullet-speed"),
  bulletMax: requireValue(document.querySelector<HTMLInputElement>("#bullet-max"), "Missing #bullet-max"),
};

const keys = new Set<string>();
const bestTimeKey = "bullent.bestTime";
const dashDistance = 72;

let baseLevel: LevelConfig = DEFAULT_LEVEL;
let level: LevelConfig = DEFAULT_LEVEL;
let state: GameState = "ready";
let player: Player = createPlayer(level);
let shooters: Shooter[] = createShooters(level);
let bullets: Bullet[] = [];
let elapsed = 0;
let bestTime = loadBestTime();
let lastTime = performance.now();
let loadError = "";
let settingsOpen = false;
let lastDirection: Vec2 = { x: 0, y: -1 };

function cloneLevel(source: LevelConfig): LevelConfig {
  return structuredClone(source);
}

function numberValue(input: HTMLInputElement): number {
  return Number(input.value);
}

function formatTime(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}

function loadBestTime(): number {
  try {
    const value = Number(localStorage.getItem(bestTimeKey) ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function saveBestTime(value: number): void {
  bestTime = Math.max(bestTime, value);
  try {
    localStorage.setItem(bestTimeKey, String(bestTime));
  } catch {
    // Local storage is optional; the in-memory record still works for this session.
  }
}

function validatedLevelFromForm(): LevelConfig {
  const shooters = [...shootersList.querySelectorAll<HTMLElement>(".shooter-row")].map((row) => ({
    x: numberValue(requireValue(row.querySelector<HTMLInputElement>(".shooter-x"), "Missing shooter x")),
    y: numberValue(requireValue(row.querySelector<HTMLInputElement>(".shooter-y"), "Missing shooter y")),
    cooldown: numberValue(requireValue(row.querySelector<HTMLInputElement>(".shooter-cooldown"), "Missing shooter cooldown")),
  }));

  const parsed = parseLevelFile({
    version: 1,
    levels: [
      {
        id: level.id,
        name: inputs.name.value,
        arena: {
          width: numberValue(inputs.arenaWidth),
          height: numberValue(inputs.arenaHeight),
        },
        player: {
          radius: numberValue(inputs.playerRadius),
          speed: numberValue(inputs.playerSpeed),
        },
        bullets: {
          radius: numberValue(inputs.bulletRadius),
          speed: numberValue(inputs.bulletSpeed),
          max: numberValue(inputs.bulletMax),
        },
        shooters,
      },
    ],
  });

  return parsed.levels[0] ?? level;
}

function shooterRowHtml(shooter: LevelConfig["shooters"][number]): string {
  return `
    <div class="shooter-row">
      <label>
        X
        <input class="shooter-x" type="number" min="1" step="1" value="${shooter.x}" />
      </label>
      <label>
        Y
        <input class="shooter-y" type="number" min="1" step="1" value="${shooter.y}" />
      </label>
      <label>
        Cooldown
        <input class="shooter-cooldown" type="number" min="0.1" step="0.1" value="${shooter.cooldown}" />
      </label>
      <button class="remove-shooter" type="button">Remove</button>
    </div>
  `;
}

function renderSettingsForm(source: LevelConfig): void {
  inputs.name.value = source.name;
  inputs.arenaWidth.value = String(source.arena.width);
  inputs.arenaHeight.value = String(source.arena.height);
  inputs.playerRadius.value = String(source.player.radius);
  inputs.playerSpeed.value = String(source.player.speed);
  inputs.bulletRadius.value = String(source.bullets.radius);
  inputs.bulletSpeed.value = String(source.bullets.speed);
  inputs.bulletMax.value = String(source.bullets.max);
  shootersList.innerHTML = source.shooters.map(shooterRowHtml).join("");
}

function openSettings(): void {
  if (loadError || state === "running") {
    return;
  }

  settingsOpen = true;
  settingsError.textContent = "";
  renderSettingsForm(level);
  settingsPanel.hidden = false;
  settingsToggle.hidden = true;
  inputs.name.focus();
}

function closeSettings(): void {
  settingsOpen = false;
  settingsPanel.hidden = true;
  syncSettingsVisibility();
  gameCanvas.focus();
}

function applyLevel(nextLevel: LevelConfig): void {
  level = cloneLevel(nextLevel);
  reset("ready");
  resizeCanvas();
  render();
}

function syncSettingsVisibility(): void {
  const canConfigure = !loadError && !settingsOpen && (state === "ready" || state === "dead");
  settingsToggle.hidden = !canConfigure;
}

function reset(nextState: GameState = "running"): void {
  state = nextState;
  player = createPlayer(level);
  shooters = createShooters(level);
  bullets = [];
  elapsed = 0;
}

function startOrRestart(): void {
  if (!loadError && !settingsOpen && state !== "running") {
    reset("running");
  }
}

function inputDirection(): Vec2 {
  return {
    x: Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a")),
    y: Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w")),
  };
}

function activeDashDirection(): Vec2 {
  const direction = inputDirection();
  if (direction.x !== 0 || direction.y !== 0) {
    lastDirection = direction;
    return direction;
  }
  return lastDirection;
}

function dashPlayer(): void {
  if (state !== "running") {
    return;
  }

  player = movePlayer(player, activeDashDirection(), dashDistance / player.speed, level);
}

function update(dt: number): void {
  if (state !== "running") {
    return;
  }

  elapsed += dt;

  const direction = inputDirection();
  player = movePlayer(player, direction, dt, level);
  if (direction.x !== 0 || direction.y !== 0) {
    lastDirection = direction;
  }

  for (const shooter of shooters) {
    shooter.elapsed += dt;
    while (shooter.elapsed >= shooter.cooldown) {
      shooter.elapsed -= shooter.cooldown;
      if (bullets.length < level.bullets.max) {
        bullets.push(spawnBullet(shooter, player.pos, level));
      }
    }
  }

  bullets = bullets.map((bullet) => moveBullet(bullet, dt, level));

  if (bullets.some((bullet) => circlesTouch(player, bullet))) {
    saveBestTime(elapsed);
    state = "dead";
  }
}

function resizeCanvas(): void {
  const ratio = window.devicePixelRatio || 1;
  gameCanvas.width = level.arena.width * ratio;
  gameCanvas.height = level.arena.height * ratio;
  gameShell.style.width = `min(${level.arena.width}px, calc(100vw - 32px))`;
  gameShell.style.aspectRatio = `${level.arena.width} / ${level.arena.height}`;
  gameCanvas.style.width = `min(${level.arena.width}px, calc(100vw - 32px))`;
  gameCanvas.style.aspectRatio = `${level.arena.width} / ${level.arena.height}`;
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

  if (loadError) {
    ctx.fillText("Level load failed", level.arena.width / 2, level.arena.height / 2);
    ctx.font = "600 14px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(loadError, level.arena.width / 2, level.arena.height / 2 + 28);
  } else if (state === "ready") {
    ctx.fillText("Click / Enter to start", level.arena.width / 2, level.arena.height / 2 + 58);
  } else if (state === "dead") {
    ctx.fillText(`Survived ${formatTime(elapsed)}`, level.arena.width / 2, level.arena.height / 2 + 42);
    ctx.font = "600 16px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`Best ${formatTime(bestTime)} · Restart?`, level.arena.width / 2, level.arena.height / 2 + 72);
  }
}

function render(): void {
  ctx.clearRect(0, 0, level.arena.width, level.arena.height);

  const gradient = ctx.createLinearGradient(0, 0, level.arena.width, level.arena.height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(0.55, "#18181b");
  gradient.addColorStop(1, "#052e2b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, level.arena.width, level.arena.height);

  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, level.arena.width - 2, level.arena.height - 2);

  ctx.fillStyle = "#cbd5e1";
  ctx.font = "600 14px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(`Time ${formatTime(elapsed)}`, 18, 16);
  ctx.fillText(level.name, 18, 36);

  ctx.textAlign = "right";
  ctx.fillText(`Best ${formatTime(bestTime)}`, level.arena.width - 18, 16);
  ctx.fillText(`Bullets ${bullets.length}`, level.arena.width - 18, 36);

  for (const shooter of shooters) {
    drawCircle(shooter.pos, 12, "#f97316", "#fb923c");
  }
  drawCircle(player.pos, player.radius, "#a78bfa", "#c4b5fd");
  for (const bullet of bullets) {
    drawCircle(bullet.pos, bullet.radius, "#22d3ee", "#67e8f9");
  }

  if (state !== "running") {
    ctx.fillStyle = "rgb(2 6 23 / 0.58)";
    ctx.fillRect(0, 0, level.arena.width, level.arena.height);
    drawCircle(player.pos, player.radius, "#a78bfa", "#c4b5fd");
    drawText();
  }
}

function frame(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  render();
  syncSettingsVisibility();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (settingsOpen) {
    if (key === "escape") {
      event.preventDefault();
      closeSettings();
    }
    return;
  }

  const target = event.target instanceof HTMLElement ? event.target : null;
  if (target?.closest("button, input, form")) {
    return;
  }

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar"].includes(key)) {
    event.preventDefault();
  }
  if (key === "v") {
    event.preventDefault();
    dashPlayer();
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
  if (settingsOpen) {
    return;
  }
  gameCanvas.focus();
  startOrRestart();
});

settingsToggle.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
cancelSettingsButton.addEventListener("click", closeSettings);

addShooterButton.addEventListener("click", () => {
  shootersList.insertAdjacentHTML(
    "beforeend",
    shooterRowHtml({
      x: Math.round(numberValue(inputs.arenaWidth) / 2) || level.arena.width / 2,
      y: 28,
      cooldown: 0.9,
    }),
  );
  settingsError.textContent = "";
});

shootersList.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".remove-shooter");
  if (!button) {
    return;
  }

  const rows = shootersList.querySelectorAll(".shooter-row");
  if (rows.length <= 1) {
    settingsError.textContent = "Keep at least one shooter.";
    return;
  }

  button.closest(".shooter-row")?.remove();
  settingsError.textContent = "";
});

resetSettingsButton.addEventListener("click", () => {
  applyLevel(baseLevel);
  renderSettingsForm(level);
  settingsError.textContent = "";
});

settingsPanel.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
  }
});

settingsPanel.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    applyLevel(validatedLevelFromForm());
    closeSettings();
  } catch (error) {
    settingsError.textContent = error instanceof Error ? error.message : "Invalid level.";
  }
});

window.addEventListener("resize", resizeCanvas);

async function loadFirstLevel(): Promise<LevelConfig> {
  const response = await fetch("/levels.json");
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const levels = parseLevelFile(await response.json()).levels;
  const first = levels[0];
  if (!first) {
    throw new Error("No levels found");
  }
  return first;
}

async function init(): Promise<void> {
  try {
    baseLevel = cloneLevel(await loadFirstLevel());
    level = cloneLevel(baseLevel);
    reset("ready");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown error";
  }

  resizeCanvas();
  render();
  syncSettingsVisibility();
  requestAnimationFrame(frame);
}

void init();
