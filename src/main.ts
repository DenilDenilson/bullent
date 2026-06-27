import "./style.css";
import { getDom } from "./dom.ts";

import {
  DEFAULT_LEVEL,
  type GameState,
  type LevelConfig,
  type Vec2,
  createPlayer,
  createShooters,
} from "./core.ts";
import {
  applyPageMode,
  getPageMode,
  goToMobileMode,
  shouldRedirectStandaloneToMobile,
  supportsTouchFirstControls,
} from "./mode.ts";
import { loadBestTime, saveBestTime } from "./storage.ts";
import { cloneLevel, numberValue } from "./utils.ts";
import { loadFirstLevel, loadPowersConfig } from "./loaders.ts";
// S E S S I O N
import {
  activatePresagioGameSession,
  createGameSession,
  dashGameSession,
  getSessionScoreTime,
  resetGameSession,
  setSessionLevel,
  updateGameSession,
  type GameSession,
  type ReplayFrame,
} from "./session.ts";
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
  syncDeathScreen as syncDeathScreenUi,
  syncLetargoPowerUi,
  syncPresagioPowerUi,
  syncMobileHud as syncMobileHudUi,
  syncSettingsVisibility as syncSettingsVisibilityUi,
  syncStartScreen as syncStartScreenUi,
  syncTouchControls as syncTouchControlsUi,
} from "./ui.ts";
// B O T !!!
import { createAutoplayBot, type BotInput } from "./bot.ts";

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
  presagioPower,
  startScreen,
  startCta,
  startBotCta,
  deathScreen,
  deathRestartCta,
  deathHumanCta,
  deathBotCta,
  deathReplayCta,
  deathStartCta,
  touchControls,
  touchJoystickZone,
  touchJoystickBase,
  touchJoystickThumb,
  touchPowerPad,
  touchLetargoZone,
  touchDestelloButton,
  touchPresagioButton,
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

const mode = getPageMode();
applyPageMode(mode);

let baseLevel: LevelConfig = DEFAULT_LEVEL;
let session: GameSession | null = null;
let bestTime = loadBestTime();
let lastTime = performance.now();
let loadError = "";
let settingsOpen = false;

type ControlMode = "human" | "bot";
let deathReplayStartedAt: number | null = null;

const autoplayBot = createAutoplayBot();
let controlMode: ControlMode = "human";

const emptyBotInput: BotInput = {
  direction: { x: 0, y: 0 },
  slowHeld: false,
  useDash: false,
  usePresagio: false,
};

function currentLevel(): LevelConfig {
  return session?.level ?? baseLevel;
}

function currentState(): GameState {
  return session?.state ?? "ready";
}

// WRAPERS

function syncTouchControls(): void {
  syncTouchControlsUi({
    mode,
    state: currentState(),
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
    elapsed: session ? getSessionScoreTime(session) : 0,
    bestTime,
    bulletCount: session?.bullets.length ?? 0,
  });
}

function syncSlowPowerUi(): void {
  if (!session) {
    return;
  }

  syncLetargoPowerUi({
    slowPower,
    letargo: session.letargo,
    config: session.powers.letargo,
  });
}

function syncPresagioPower(): void {
  if (!session) {
    return;
  }

  syncPresagioPowerUi({
    presagioPower,
    presagio: session.presagio,
    config: session.powers.presagio,
  });
}

function syncSettingsVisibility(): void {
  syncSettingsVisibilityUi({
    settingsToggle,
    loadError,
    settingsOpen,
    state: currentState(),
  });
}

function syncStartScreen(): void {
  syncStartScreenUi({
    startScreen,
    powersBar,
    loadError,
    settingsOpen,
    state: currentState(),
  });
}

function syncDeathScreen(): void {
  syncDeathScreenUi({
    deathScreen,
    loadError,
    settingsOpen,
    state: currentState(),
    replaying: deathReplayStartedAt !== null,
  });
}

function resizeCanvas(): void {
  resizeGameCanvas({
    canvas: gameCanvas,
    ctx,
    shell: gameShell,
    level: currentLevel(),
    mode,
  });
}

function activeReplayFrame(): ReplayFrame | null {
  if (!session || deathReplayStartedAt === null) {
    return null;
  }

  const frames = session.deathReplayFrames;
  const first = frames[0];
  const last = frames[frames.length - 1];

  if (!first || !last) {
    deathReplayStartedAt = null;
    return null;
  }

  const elapsed = (performance.now() - deathReplayStartedAt) / 1000;
  const duration = Math.max(0.35, last.time - first.time);

  if (elapsed >= duration) {
    deathReplayStartedAt = null;
    return null;
  }

  const targetTime = first.time + elapsed;

  return frames.find((frame) => frame.time >= targetTime) ?? last;
}

function render(): void {
  const level = currentLevel();
  const replayFrame = activeReplayFrame();
  const replaying = replayFrame !== null;
  const lastReplayFrame = session?.deathReplayFrames.at(-1) ?? null;

  renderGame({
    ctx,
    level,
    mode,
    state: replaying ? "running" : (session?.state ?? "ready"),
    player: replayFrame?.player ?? session?.player ?? createPlayer(level),
    shooters: session?.shooters ?? createShooters(level),
    bullets: replayFrame?.bullets ?? session?.bullets ?? [],
    playerTrail: replaying ? [] : (session?.playerTrail ?? []),
    presagioSegments: replaying ? [] : (session?.presagioSegments ?? []),
    timePickup: replayFrame?.timePickup ?? session?.timePickup ?? null,
    pickupCollectEffects: replaying ? [] : (session?.pickupCollectEffects ?? []),
    dashEffects: replaying ? [] : (session?.dashEffects ?? []),
    trailLifetime:
      loadError || !session ? 1 : session.powers.letargo.visual.trailLifetime,
    elapsed: session ? getSessionScoreTime(session) : 0,
    bestTime,
    killingBullet:
      !replaying || replayFrame === lastReplayFrame
        ? (session?.killingBullet ?? null)
        : null,
    loadError,
  });
}

// F U N C I O N A L E S

function openSettings(): void {
  if (loadError || currentState() === "running") {
    return;
  }

  settingsOpen = true;
  settingsError.textContent = "";

  populateSettingsForm({
    source: currentLevel(),
    inputs,
    shootersList,
  });

  settingsPanel.hidden = false;
  settingsToggle.hidden = true;
  syncStartScreen();
  syncDeathScreen();
  syncTouchControls();
  inputs.name.focus();
}

function closeSettings(): void {
  settingsOpen = false;
  settingsPanel.hidden = true;
  syncSettingsVisibility();
  syncStartScreen();
  syncDeathScreen();
  syncTouchControls();
  gameCanvas.focus();
}

function applyLevel(nextLevel: LevelConfig): void {
  if (!session) {
    return;
  }

  setSessionLevel(session, nextLevel, "ready");
  deathReplayStartedAt = null;
  resizeCanvas();
  render();
  syncDeathScreen();
}

function startOrRestart(nextControlMode: ControlMode = controlMode): void {
  if (!session || loadError || settingsOpen || session.state === "running") {
    return;
  }

  deathReplayStartedAt = null;
  controlMode = nextControlMode;
  autoplayBot.reset();
  resetGameSession(session, "running");
  syncStartScreen();
  syncDeathScreen();
  syncTouchControls();
}

function returnToStartScreen(): void {
  if (!session || loadError || settingsOpen) {
    return;
  }

  deathReplayStartedAt = null;
  controlMode = "human";
  autoplayBot.reset();
  resetGameSession(session, "ready");
  syncStartScreen();
  syncDeathScreen();
  syncTouchControls();
}

function startDeathReplay(): void {
  if (
    !session ||
    session.state !== "dead" ||
    session.deathReplayFrames.length === 0
  ) {
    return;
  }

  deathReplayStartedAt = performance.now();
  syncDeathScreen();
}

function inputDirection(botInput: BotInput = emptyBotInput): Vec2 {
  if (controlMode === "bot" && session?.state === "running") {
    return botInput.direction;
  }

  const keyboardDirection = keyboardInput.direction();

  return keyboardDirection.x !== 0 || keyboardDirection.y !== 0
    ? keyboardDirection
    : touchInput.direction();
}

function dashPlayer(): void {
  if (!session) {
    return;
  }

  dashGameSession(session, inputDirection());
}

function activatePresagioPower(): void {
  if (!session) return;

  activatePresagioGameSession(session);
}

function update(rawDt: number): void {
  if (!session) {
    return;
  }

  const botInput =
    controlMode === "bot" && session.state === "running"
      ? autoplayBot.think(session, rawDt)
      : emptyBotInput;

  if (botInput.usePresagio) {
    activatePresagioGameSession(session);
  }

  if (botInput.useDash) {
    dashGameSession(session, botInput.direction);
  }

  const result = updateGameSession(session, {
    rawDt,
    direction: inputDirection(botInput),
    slowHeld:
      controlMode === "bot"
        ? botInput.slowHeld
        : keyboardInput.isPressed("control") || touchInput.isSlowHeld(),
  });

  if (result.died) {
    bestTime = saveBestTime(bestTime, getSessionScoreTime(session));
    syncTouchControls();
  }
}

function frame(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  render();
  syncSettingsVisibility();
  syncStartScreen();
  syncDeathScreen();
  syncSlowPowerUi();
  syncPresagioPower();
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

  onPresagio: () => {
    activatePresagioPower();
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
    powerPad: touchPowerPad,
    letargoZone: touchLetargoZone,
    destelloButton: touchDestelloButton,
    presagioButton: touchPresagioButton,
  },
  config: {
    joystickRadius: 42,
    joystickDeadZone: 8,
  },
  callbacks: {
    isSettingsOpen: () => settingsOpen,

    onFocus: () => {
      gameCanvas.focus();
    },

    onStart: () => {
      startOrRestart("human");
    },

    onDash: () => {
      dashPlayer();
    },

    onPresagio: () => {
      activatePresagioPower();
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
  startOrRestart("human");
});

startBotCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  gameCanvas.focus();
  startOrRestart("bot");
});

deathRestartCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  gameCanvas.focus();
  startOrRestart();
});

deathHumanCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  gameCanvas.focus();
  startOrRestart("human");
});

deathBotCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  gameCanvas.focus();
  startOrRestart("bot");
});

deathReplayCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  gameCanvas.focus();
  startDeathReplay();
});

deathStartCta.addEventListener("click", (event: any) => {
  event.stopPropagation();
  gameCanvas.focus();
  returnToStartScreen();
});

settingsToggle.addEventListener("click", openSettings);
settingsClose.addEventListener("click", closeSettings);
cancelSettingsButton.addEventListener("click", closeSettings);

addShooterButton.addEventListener("click", () => {
  const level = currentLevel();

  shootersList.insertAdjacentHTML(
    "beforeend",
    shooterRowHtml({
      x:
        Math.round(numberValue(inputs.arenaWidth) / 2) || level.arena.width / 2,
      y: 28,
      cooldown: 0.9,
    }),
  );

  settingsError.textContent = "";
});

shootersList.addEventListener("click", (event: any) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    ".remove-shooter",
  );
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
    source: currentLevel(),
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

settingsPanel.addEventListener("submit", (event) => {
  event.preventDefault();

  try {
    applyLevel(
      readLevelFromSettingsForm({
        currentLevel: currentLevel(),
        inputs,
        shootersList,
      }),
    );

    closeSettings();
  } catch (error) {
    settingsError.textContent =
      error instanceof Error ? error.message : "Invalid level.";
  }
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("resize", syncTouchControls);

async function init(): Promise<void> {
  try {
    const powers = await loadPowersConfig();

    baseLevel = cloneLevel(await loadFirstLevel());
    session = createGameSession({
      level: baseLevel,
      powers,
      state: "ready",
    });
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown error";

    resizeCanvas();
    render();
    syncSettingsVisibility();
    syncStartScreen();
    syncDeathScreen();
    syncMobileHud();

    return;
  }

  resizeCanvas();
  syncTouchControls();
  render();
  syncSettingsVisibility();
  syncStartScreen();
  syncDeathScreen();
  syncSlowPowerUi();
  syncPresagioPower();
  syncMobileHud();
  requestAnimationFrame(frame);
}

void init();
