import type { GameState } from "./core.ts";
import type { PageMode } from "./mode.ts";
import type { LetargoConfig, LetargoState } from "./powers/letargo.ts";
import { formatTime } from "./utils.ts";

export function syncTouchControls(args: {
  mode: PageMode;
  state: GameState;
  settingsOpen: boolean;
  keyboardPreferred: boolean;
  touchFirstControlsSupported: boolean;
  touchControls: HTMLElement;
}): void {
  const {
    mode,
    state,
    settingsOpen,
    keyboardPreferred,
    touchFirstControlsSupported,
    touchControls,
  } = args;

  const touchAllowed = mode === "mobile" || (touchFirstControlsSupported && !keyboardPreferred);
  const enabled = mode !== "embed" && state === "running" && touchAllowed && !settingsOpen;

  touchControls.hidden = !enabled;
  document.body.classList.toggle("touch-controls", enabled);
}

export function syncMobileHud(args: {
  mode: PageMode;
  mobileHud: HTMLElement;
  mobileTime: HTMLElement;
  mobileBest: HTMLElement;
  mobileBullets: HTMLElement;
  elapsed: number;
  bestTime: number;
  bulletCount: number;
}): void {
  const {
    mode,
    mobileHud,
    mobileTime,
    mobileBest,
    mobileBullets,
    elapsed,
    bestTime,
    bulletCount,
  } = args;

  mobileHud.hidden = mode !== "mobile";
  mobileTime.textContent = formatTime(elapsed);
  mobileBest.textContent = formatTime(bestTime);
  mobileBullets.textContent = String(bulletCount);
}

export function syncLetargoPowerUi(args: {
  slowPower: HTMLElement;
  letargo: LetargoState;
  config: LetargoConfig;
}): void {
  const { slowPower, letargo, config } = args;

  const cover =
    letargo.cooldownRemaining > 0
      ? letargo.cooldownRemaining / config.cooldown
      : 1 - letargo.energy / config.maxEnergy;

  const stateName =
    letargo.cooldownRemaining > 0
      ? "cooldown"
      : letargo.active
        ? "active"
        : letargo.energy >= config.maxEnergy
          ? "ready"
          : "recharging";

  slowPower.dataset.state = stateName;
  slowPower.style.setProperty("--slow-cover", `${Math.max(0, Math.min(1, cover)) * 360}deg`);

  slowPower.title =
    stateName === "cooldown"
      ? `Letargo: recargando ${formatTime(letargo.cooldownRemaining)}`
      : `Letargo: Ctrl (${formatTime(letargo.energy)})`;
}

export function syncSettingsVisibility(args: {
  settingsToggle: HTMLButtonElement;
  loadError: string;
  settingsOpen: boolean;
  state: GameState;
}): void {
  const { settingsToggle, loadError, settingsOpen, state } = args;

  const canConfigure = !loadError && !settingsOpen && (state === "ready" || state === "dead");

  settingsToggle.hidden = !canConfigure;
}

export function syncStartScreen(args: {
  startScreen: HTMLElement;
  powersBar: HTMLElement;
  loadError: string;
  settingsOpen: boolean;
  state: GameState;
}): void {
  const {
    startScreen,
    powersBar,
    loadError,
    settingsOpen,
    state,
  } = args;

  const showStart = !loadError && !settingsOpen && state === "ready";

  startScreen.hidden = !showStart;
  powersBar.hidden = showStart;
}