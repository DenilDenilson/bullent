// @ts-ignore: CSS module declaration not available in this TS config
import "./style.css";
import { requireValue, getDom } from "./dom.ts"

import {
  DEFAULT_LEVEL,
  DEFAULT_POWERS,
  type Bullet,
  type GameState,
  type LevelConfig,
  type PowersConfig,
  type Player,
  type Shooter,
  type SlowMotionState,
  type Vec2,
  circlesTouch,
  createPlayer,
  createShooters,
  createSlowMotionState,
  moveBullet,
  movePlayer,
  parseLevelFile,
  parsePowersConfig,
  spawnBullet,
  updateSlowMotion,
} from "./core.ts";
import { applyPageMode, getPageMode } from "./mode.ts";
import { loadBestTime, saveBestTime } from "./storage.ts";
import { cloneLevel, formatTime, numberValue } from "./utils.ts";
import { loadFirstLevel, loadPowersConfig } from "./loaders.ts";

const {
  gameCanvas,
  ctx,
  gameShell,
  mobileHud,
  mobileTime,
  mobileBest,
  mobileBullets,
  powersBar,
  slowPower,
  startScreen,
  startCta,
  touchControls,
  touchJoystickZone,
  touchJoystickBase,
  touchJoystickThumb,
  touchPowerZone,
  settingsToggle,
  settingsPanel,
  settingsClose,
  addShooterButton,
  resetSettingsButton,
  cancelSettingsButton,
  shootersList,
  settingsError,
  inputs,
} = getDom();

const mode = getPageMode()
applyPageMode(mode)

const keys = new Set<string>();
const dashDistance = 72;
const playerTrailInterval = 0.035;
const playerTrailLifetime = 0.45;
const joystickRadius = 42;
const joystickDeadZone = 8;
const doubleTapWindow = 320;
const holdDelay = 180;

type TrailPoint = {
  pos: Vec2;
  radius: number;
  age: number;
};

let baseLevel: LevelConfig = DEFAULT_LEVEL;
let level: LevelConfig = DEFAULT_LEVEL;
let powers: PowersConfig = DEFAULT_POWERS;
let state: GameState = "ready";
let player: Player = createPlayer(level);
let shooters: Shooter[] = createShooters(level);
let bullets: Bullet[] = [];
let slowMotion: SlowMotionState = createSlowMotionState(powers.slowMotion);
let elapsed = 0;
let bestTime = loadBestTime();
let lastTime = performance.now();
let loadError = "";
let settingsOpen = false;
let lastDirection: Vec2 = { x: 0, y: -1 };
let playerTrail: TrailPoint[] = [];
let playerTrailClock = 0;
let touchDirection: Vec2 = { x: 0, y: 0 };
let touchSlowHeld = false;
let keyboardPreferred = false;
let touchJoystickPointerId: number | null = null;
let touchPowerPointerId: number | null = null;
let touchPowerStartedAt = 0;
let lastPowerTapAt = 0;
let touchHoldTimer = 0;

function supportsTouchFirstControls(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    !window.matchMedia("(any-pointer: fine)").matches &&
    !window.matchMedia("(hover: hover)").matches
  );
}

function shouldRedirectStandaloneToMobile(): boolean {
  return mode === "standalone" && (supportsTouchFirstControls() || window.innerWidth <= 720);
}

function goToMobileMode(): void {
  window.location.href = `${window.location.pathname}?mobile=1`;
}

function syncTouchControls(): void {
  const touchAllowed = mode === "mobile" || (supportsTouchFirstControls() && !keyboardPreferred);
  const enabled = mode !== "embed" && state === "running" && touchAllowed && !settingsOpen;
  touchControls.hidden = !enabled;
  document.body.classList.toggle("touch-controls", enabled);
}

function syncMobileHud(): void {
  mobileHud.hidden = mode !== "mobile";
  mobileTime.textContent = formatTime(elapsed);
  mobileBest.textContent = formatTime(bestTime);
  mobileBullets.textContent = String(bullets.length);
}



function syncSlowPowerUi(): void {
  const config = powers.slowMotion;
  const cover =
    slowMotion.cooldownRemaining > 0
      ? slowMotion.cooldownRemaining / config.cooldown
      : 1 - slowMotion.energy / config.maxEnergy;
  const stateName =
    slowMotion.cooldownRemaining > 0
      ? "cooldown"
      : slowMotion.active
        ? "active"
        : slowMotion.energy >= config.maxEnergy
          ? "ready"
          : "recharging";

  slowPower.dataset.state = stateName;
  slowPower.style.setProperty("--slow-cover", `${Math.max(0, Math.min(1, cover)) * 360}deg`);
  slowPower.title =
    stateName === "cooldown"
      ? `Camara lenta: recargando ${formatTime(slowMotion.cooldownRemaining)}`
      : `Camara lenta: Ctrl (${formatTime(slowMotion.energy)})`;
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
  syncStartScreen();
  syncTouchControls();
  inputs.name.focus();
}

function closeSettings(): void {
  settingsOpen = false;
  settingsPanel.hidden = true;
  syncSettingsVisibility();
  syncStartScreen();
  syncTouchControls();
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

function syncStartScreen(): void {
  const showStart = !loadError && !settingsOpen && state === "ready";
  startScreen.hidden = !showStart;
  powersBar.hidden = showStart;
}

function reset(nextState: GameState = "running"): void {
  state = nextState;
  player = createPlayer(level);
  shooters = createShooters(level);
  bullets = [];
  slowMotion = createSlowMotionState(powers.slowMotion);
  playerTrail = [];
  playerTrailClock = 0;
  elapsed = 0;
}

function startOrRestart(): void {
  if (!loadError && !settingsOpen && state !== "running") {
    reset("running");
    syncStartScreen();
    syncTouchControls();
  }
}

function inputDirection(): Vec2 {
  const keyboardDirection = {
    x: Number(keys.has("arrowright") || keys.has("d")) - Number(keys.has("arrowleft") || keys.has("a")),
    y: Number(keys.has("arrowdown") || keys.has("s")) - Number(keys.has("arrowup") || keys.has("w")),
  };
  return keyboardDirection.x !== 0 || keyboardDirection.y !== 0 ? keyboardDirection : touchDirection;
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

function updatePlayerTrail(rawDt: number): void {
  playerTrail = playerTrail
    .map((point) => ({ ...point, age: point.age + rawDt }))
    .filter((point) => point.age < playerTrailLifetime);

  if (!slowMotion.active) {
    playerTrailClock = 0;
    return;
  }

  playerTrailClock += rawDt;
  if (playerTrailClock >= playerTrailInterval) {
    playerTrailClock = 0;
    playerTrail.push({
      pos: { ...player.pos },
      radius: player.radius,
      age: 0,
    });
  }
}

function update(rawDt: number): void {
  if (state !== "running") {
    return;
  }

  const slowStep = updateSlowMotion(slowMotion, keys.has("control") || touchSlowHeld, rawDt, powers.slowMotion);
  slowMotion = slowStep.state;
  const dt = slowStep.simulationDt;

  elapsed += dt;

  const direction = inputDirection();
  player = movePlayer(player, direction, dt, level);
  if (direction.x !== 0 || direction.y !== 0) {
    lastDirection = direction;
  }
  updatePlayerTrail(rawDt);

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
    bestTime = saveBestTime(bestTime, elapsed);
    state = "dead";
    syncTouchControls();
  }
}

function resizeCanvas(): void {
  const ratio = window.devicePixelRatio || 1;
  const mobileControlsHeight = Math.min(160, Math.max(128, window.innerHeight * 0.18));
  const mobileAvailableHeight = Math.max(360, window.innerHeight - (96 + mobileControlsHeight));
  const mobileWidth = Math.max(
    280,
    Math.min(620, window.innerWidth - 24, mobileAvailableHeight * (level.arena.width / level.arena.height)),
  );
  const scale = mode === "mobile" ? mobileWidth / level.arena.width : 1;
  const shellWidth = mode === "embed" ? `min(${level.arena.width}px, 100vw)` : mode === "mobile" ? `${mobileWidth}px` : `min(${level.arena.width}px, calc(100vw - 32px))`;

  document.body.style.setProperty("--mobile-game-width", `${mobileWidth}px`);
  gameCanvas.width = Math.round(level.arena.width * ratio * scale);
  gameCanvas.height = Math.round(level.arena.height * ratio * scale);
  gameShell.style.width = shellWidth;
  gameShell.style.aspectRatio = `${level.arena.width} / ${level.arena.height}`;
  gameCanvas.style.width = shellWidth;
  gameCanvas.style.aspectRatio = `${level.arena.width} / ${level.arena.height}`;
  ctx.setTransform(ratio * scale, 0, 0, ratio * scale, 0, 0);
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

function drawPlayerTrail(): void {
  for (const point of playerTrail) {
    const progress = point.age / playerTrailLifetime;
    const alpha = Math.max(0, 1 - progress) * 0.34;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 22;
    ctx.shadowColor = "#5eead4";
    ctx.fillStyle = "#a7f3d0";
    ctx.beginPath();
    ctx.arc(point.pos.x, point.pos.y, point.radius * (1 + progress * 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
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
    drawCircle(shooter.pos, 12, "#f97316", "#fb923c");
  }
  drawPlayerTrail();
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
  syncStartScreen();
  syncSlowPowerUi();
  syncMobileHud();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  keyboardPreferred = true;
  syncTouchControls();

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

function setJoystickFromPointer(event: PointerEvent): void {
  const rect = touchJoystickZone.getBoundingClientRect();
  const center = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
  const dx = event.clientX - center.x;
  const dy = event.clientY - center.y;
  const distance = Math.hypot(dx, dy);
  const limitedDistance = Math.min(distance, joystickRadius);
  const angle = Math.atan2(dy, dx);
  const offset = distance === 0 ? { x: 0, y: 0 } : { x: Math.cos(angle) * limitedDistance, y: Math.sin(angle) * limitedDistance };

  touchJoystickThumb.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
  touchDirection =
    distance < joystickDeadZone
      ? { x: 0, y: 0 }
      : {
          x: offset.x / joystickRadius,
          y: offset.y / joystickRadius,
        };
}

function resetJoystick(): void {
  touchJoystickPointerId = null;
  touchDirection = { x: 0, y: 0 };
  touchJoystickBase.classList.remove("is-active");
  touchJoystickThumb.style.transform = "translate(0, 0)";
}

touchJoystickZone.addEventListener("pointerdown", (event: any) => {
  if (settingsOpen || touchJoystickPointerId !== null) {
    return;
  }
  event.preventDefault();
  gameCanvas.focus();
  startOrRestart();
  touchJoystickPointerId = event.pointerId;
  touchJoystickZone.setPointerCapture(event.pointerId);
  touchJoystickBase.classList.add("is-active");
  setJoystickFromPointer(event);
});

touchJoystickZone.addEventListener("pointermove", (event: any) => {
  if (event.pointerId === touchJoystickPointerId) {
    event.preventDefault();
    setJoystickFromPointer(event);
  }
});

touchJoystickZone.addEventListener("pointerup", (event: any) => {
  if (event.pointerId === touchJoystickPointerId) {
    resetJoystick();
  }
});

touchJoystickZone.addEventListener("pointercancel", (event: any) => {
  if (event.pointerId === touchJoystickPointerId) {
    resetJoystick();
  }
});

function clearTouchPowerHold(): void {
  window.clearTimeout(touchHoldTimer);
  touchHoldTimer = 0;
  touchSlowHeld = false;
  touchPowerZone.classList.remove("is-holding");
}

touchPowerZone.addEventListener("pointerdown", (event: any) => {
  if (settingsOpen || touchPowerPointerId !== null) {
    return;
  }
  event.preventDefault();
  gameCanvas.focus();
  startOrRestart();
  touchPowerPointerId = event.pointerId;
  touchPowerStartedAt = performance.now();
  touchPowerZone.setPointerCapture(event.pointerId);
  touchPowerZone.classList.add("is-pressed");
  touchHoldTimer = window.setTimeout(() => {
    touchSlowHeld = true;
    touchPowerZone.classList.add("is-holding");
  }, holdDelay);
});

touchPowerZone.addEventListener("pointerup", (event: any) => {
  if (event.pointerId !== touchPowerPointerId) {
    return;
  }

  const now = performance.now();
  const wasHolding = touchSlowHeld;
  touchPowerPointerId = null;
  touchPowerZone.classList.remove("is-pressed");
  clearTouchPowerHold();

  if (!wasHolding && now - touchPowerStartedAt < holdDelay && now - lastPowerTapAt < doubleTapWindow) {
    dashPlayer();
    lastPowerTapAt = 0;
    touchPowerZone.classList.add("did-dash");
    window.setTimeout(() => touchPowerZone.classList.remove("did-dash"), 160);
    return;
  }

  if (!wasHolding) {
    lastPowerTapAt = now;
  }
});

touchPowerZone.addEventListener("pointercancel", (event: any) => {
  if (event.pointerId === touchPowerPointerId) {
    touchPowerPointerId = null;
    touchPowerZone.classList.remove("is-pressed");
    clearTouchPowerHold();
  }
});

gameCanvas.addEventListener("pointerdown", () => {
  if (settingsOpen) {
    return;
  }
  if (shouldRedirectStandaloneToMobile()) {
    goToMobileMode();
    return;
  }
  gameCanvas.focus();
  startOrRestart();
});

startCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  if (shouldRedirectStandaloneToMobile()) {
    goToMobileMode();
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

shootersList.addEventListener("click", (event: any) => {
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

settingsPanel.addEventListener("keydown", (event: any) => {
  if (event.key === "Enter") {
    event.preventDefault();
  }
});

settingsPanel.addEventListener("submit", (event: any) => {
  event.preventDefault();

  try {
    applyLevel(validatedLevelFromForm());
    closeSettings();
  } catch (error) {
    settingsError.textContent = error instanceof Error ? error.message : "Invalid level.";
  }
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", syncTouchControls);


async function init(): Promise<void> {
  try {
    powers = await loadPowersConfig();
    baseLevel = cloneLevel(await loadFirstLevel());
    level = cloneLevel(baseLevel);
    reset("ready");
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown error";
  }

  resizeCanvas();
  syncTouchControls();
  render();
  syncSettingsVisibility();
  syncStartScreen();
  syncSlowPowerUi();
  syncMobileHud();
  requestAnimationFrame(frame);
}

void init();
