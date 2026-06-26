import "./style.css";
import { getDom } from "./dom.ts"

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
  spawnBullet,
} from "./core.ts";
import { applyPageMode, getPageMode, goToMobileMode, shouldRedirectStandaloneToMobile, supportsTouchFirstControls } from "./mode.ts";
import { loadBestTime, saveBestTime } from "./storage.ts";
import { cloneLevel, numberValue } from "./utils.ts";
import { loadFirstLevel, loadPowersConfig } from "./loaders.ts";
// P O D E R E S
import { type PowersConfig } from "./powers/index.ts";
import { createLetargoState, type LetargoTrailPoint, type LetargoState, updateLetargo, updateLetargoTrail } from "./powers/letargo.ts";
import { applyDestello } from "./powers/destello.ts";
// R E N D E R I Z A D O  C A N V A S
import { renderGame, resizeGameCanvas } from "./renderer.ts";
// S E T T I N G S
import {
  populateSettingsForm,
  readLevelFromSettingsForm,
  shooterRowHtml,
} from "./settings.ts";
// C O N T R O L E S
import { createKeyboardInput } from "./input/keyboard.ts";
import { createTouchInput } from "./input/touch.ts";
// UI
import {
  syncLetargoPowerUi,
  syncMobileHud as syncMobileHudUi,
  syncSettingsVisibility as syncSettingsVisibilityUi,
  syncStartScreen as syncStartScreenUi,
  syncTouchControls as syncTouchControlsUi,
} from "./ui.ts";

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

let baseLevel: LevelConfig = DEFAULT_LEVEL;
let level: LevelConfig = DEFAULT_LEVEL;
let powers!: PowersConfig;
let state: GameState = "ready";
let player: Player = createPlayer(level);
let shooters: Shooter[] = createShooters(level);
let bullets: Bullet[] = [];
let letargo!: LetargoState;
let elapsed = 0;
let bestTime = loadBestTime();
let lastTime = performance.now();
let loadError = "";
let settingsOpen = false;
let lastDirection: Vec2 = { x: 0, y: -1 };
let playerTrail: LetargoTrailPoint[] = [];
let playerTrailClock = 0;


function syncTouchControls(): void {
  syncTouchControlsUi({
    mode,
    state,
    settingsOpen,
    keyboardPreferred: keyboardInput.isKeyboardPreferred(),
    touchFirstControlsSupported: supportsTouchFirstControls(),
    touchControls,
  });
}

function syncMobileHud(): void {
  syncMobileHudUi({
    mode,
    mobileHud,
    mobileTime,
    mobileBest,
    mobileBullets,
    elapsed,
    bestTime,
    bulletCount: bullets.length,
  });
}

function syncSlowPowerUi(): void {
  syncLetargoPowerUi({
    slowPower,
    letargo,
    config: powers.letargo,
  });
}

function syncSettingsVisibility(): void {
  syncSettingsVisibilityUi({
    settingsToggle,
    loadError,
    settingsOpen,
    state,
  });
}

function syncStartScreen(): void {
  syncStartScreenUi({
    startScreen,
    powersBar,
    loadError,
    settingsOpen,
    state,
  });
}

function openSettings(): void {
  if (loadError || state === "running") {
    return;
  }

  settingsOpen = true;
  settingsError.textContent = "";
  populateSettingsForm({
    source: level,
    inputs,
    shootersList,
  });
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

function reset(nextState: GameState = "running"): void {
  state = nextState;
  player = createPlayer(level);
  shooters = createShooters(level);
  bullets = [];
  letargo = createLetargoState(powers.letargo);
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
  const keyboardDirection = keyboardInput.direction();

  return keyboardDirection.x !== 0 || keyboardDirection.y !== 0
    ? keyboardDirection
    : touchInput.direction();
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

  player = applyDestello(player, activeDashDirection(), level, powers.destello);
}

function updatePlayerTrail(rawDt: number): void {
  const nextTrail = updateLetargoTrail({
    trail: playerTrail,
    clock: playerTrailClock,
    player,
    rawDt,
    active: letargo.active,
    config: powers.letargo
  });

  playerTrail = nextTrail.trail;
  playerTrailClock = nextTrail.clock

}

function update(rawDt: number): void {
  if (state !== "running") {
    return;
  }

  const slowStep = updateLetargo(letargo,keyboardInput.isPressed("control")  || touchInput.isSlowHeld(), rawDt, powers.letargo);
  letargo = slowStep.state;
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
  resizeGameCanvas({
    canvas: gameCanvas,
    ctx,
    shell: gameShell,
    level,
    mode,
  });
}

function render(): void {
  renderGame({
    ctx,
    level,
    mode,
    state,
    player,
    shooters,
    bullets,
    playerTrail,
    trailLifetime: loadError ? 1 : powers.letargo.visual.trailLifetime,
    elapsed,
    bestTime,
    loadError,
  });
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

const keyboardInput = createKeyboardInput({
  isSettingsOpen: () => settingsOpen,

  onKeyboardPreferredChange: () => {
    syncTouchControls();
  },

  onEscape: () => {
    closeSettings();
  },

  onDash: () => {
    dashPlayer();
  },

  onStart: () => {
    startOrRestart();
  },
});

const touchInput = createTouchInput({
  elements: {
    joystickZone: touchJoystickZone,
    joystickBase: touchJoystickBase,
    joystickThumb: touchJoystickThumb,
    powerZone: touchPowerZone,
  },
  config: {
    joystickRadius: 42,
    joystickDeadZone: 8,
    doubleTapWindow: 320,
    holdDelay: 180,
  },
  callbacks: {
    isSettingsOpen: () => settingsOpen,

    onFocus: () => {
      gameCanvas.focus();
    },

    onStart: () => {
      startOrRestart();
    },

    onDash: () => {
      dashPlayer();
    },
  },
});

gameCanvas.addEventListener("pointerdown", () => {
  if (settingsOpen) {
    return;
  }
  if (shouldRedirectStandaloneToMobile(mode)) {
    goToMobileMode();
    return;
  }
  gameCanvas.focus();
  startOrRestart();
});

startCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  if (shouldRedirectStandaloneToMobile(mode)) {
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
  populateSettingsForm({
    source: level,
    inputs,
    shootersList,
  });
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
    applyLevel(
    readLevelFromSettingsForm({
      currentLevel: level,
      inputs,
      shootersList,
    }),
  );
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

    resizeCanvas()
    render()
    syncSettingsVisibility()
    syncStartScreen()
    syncMobileHud()

    return;
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
