export function requireValue<T>(value: T | null, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

export function getDom() {
    const canvas = document.querySelector<HTMLCanvasElement>("#game");
    const gameCanvas = requireValue(canvas, "Missing #game canvas");

    return {
        gameCanvas,
        ctx: requireValue(gameCanvas.getContext("2d"), "Canvas 2D is not supported"),
        gameShell: requireValue(document.querySelector<HTMLElement>("#game-shell"), "Missing #game-shell"),
        mobileHud: requireValue(document.querySelector<HTMLElement>("#mobile-hud"), "Missing #mobile-hud"),
        mobileTime: requireValue(document.querySelector<HTMLElement>("#mobile-time"), "Missing #mobile-time"),
        mobileBest: requireValue(document.querySelector<HTMLElement>("#mobile-best"), "Missing #mobile-best"),
        mobileBullets: requireValue(document.querySelector<HTMLElement>("#mobile-bullets"), "Missing #mobile-bullets"),
        powersBar: requireValue(document.querySelector<HTMLElement>("#powers-bar"), "Missing #powers-bar"),
        slowPower: requireValue(document.querySelector<HTMLElement>("#power-slow"), "Missing #power-slow"),
        startScreen: requireValue(document.querySelector<HTMLElement>("#start-screen"), "Missing #start-screen"),
        startCta: requireValue(document.querySelector<HTMLButtonElement>("#start-cta"), "Missing #start-cta"),
        touchControls: requireValue(document.querySelector<HTMLElement>("#touch-controls"), "Missing #touch-controls"),
        touchJoystickZone: requireValue(document.querySelector<HTMLElement>("#touch-joystick-zone"), "Missing #touch-joystick-zone"),
        touchJoystickBase: requireValue(document.querySelector<HTMLElement>("#touch-joystick-base"), "Missing #touch-joystick-base"),
        touchJoystickThumb: requireValue(document.querySelector<HTMLElement>("#touch-joystick-thumb"), "Missing #touch-joystick-thumb"),
        touchPowerZone: requireValue(document.querySelector<HTMLElement>("#touch-power-zone"), "Missing #touch-power-zone"),
        settingsToggle: requireValue(document.querySelector<HTMLButtonElement>("#settings-toggle"), "Missing #settings-toggle"),
        settingsPanel: requireValue(document.querySelector<HTMLFormElement>("#settings-panel"), "Missing #settings-panel"),
        settingsClose: requireValue(document.querySelector<HTMLButtonElement>("#settings-close"), "Missing #settings-close"),
        addShooterButton: requireValue(document.querySelector<HTMLButtonElement>("#add-shooter"), "Missing #add-shooter"),
        resetSettingsButton: requireValue(document.querySelector<HTMLButtonElement>("#reset-settings"), "Missing #reset-settings"),
        cancelSettingsButton: requireValue(document.querySelector<HTMLButtonElement>("#cancel-settings"), "Missing #cancel-settings"),
        shootersList: requireValue(document.querySelector<HTMLElement>("#shooters-list"), "Missing #shooters-list"),
        settingsError: requireValue(document.querySelector<HTMLElement>("#settings-error"), "Missing #settings-error"),
        inputs: {
            name: requireValue(document.querySelector<HTMLInputElement>("#level-name"), "Missing #level-name"),
            arenaWidth: requireValue(document.querySelector<HTMLInputElement>("#arena-width"), "Missing #arena-width"),
            arenaHeight: requireValue(document.querySelector<HTMLInputElement>("#arena-height"), "Missing #arena-height"),
            playerRadius: requireValue(document.querySelector<HTMLInputElement>("#player-radius"), "Missing #player-radius"),
            playerSpeed: requireValue(document.querySelector<HTMLInputElement>("#player-speed"), "Missing #player-speed"),
            bulletRadius: requireValue(document.querySelector<HTMLInputElement>("#bullet-radius"), "Missing #bullet-radius"),
            bulletSpeed: requireValue(document.querySelector<HTMLInputElement>("#bullet-speed"), "Missing #bullet-speed"),
            bulletMax: requireValue(document.querySelector<HTMLInputElement>("#bullet-max"), "Missing #bullet-max"),
        }
    }
}