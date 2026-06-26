import type { Vec2 } from "../core.ts";

export type TouchInputConfig = {
  joystickRadius: number;
  joystickDeadZone: number;
};

export type TouchInputElements = {
  joystickZone: HTMLElement;
  joystickBase: HTMLElement;
  joystickThumb: HTMLElement;
  powerPad: HTMLElement;
  letargoZone: HTMLButtonElement;
  destelloButton: HTMLButtonElement;
  presagioButton: HTMLButtonElement;
};

export type TouchInputCallbacks = {
  isSettingsOpen: () => boolean;
  onFocus: () => void;
  onStart: () => void;
  onDash: () => void;
  onPresagio: () => void;
};

export type TouchInput = {
  direction: () => Vec2;
  isSlowHeld: () => boolean;
  resetJoystick: () => void;
  clearPowerHold: () => void;
};

export function createTouchInput(args: {
  elements: TouchInputElements;
  config: TouchInputConfig;
  callbacks: TouchInputCallbacks;
}): TouchInput {
  const { elements, config, callbacks } = args;

  let touchDirection: Vec2 = { x: 0, y: 0 };
  let touchSlowHeld = false;
  let joystickPointerId: number | null = null;
  let letargoPointerId: number | null = null;

  function focusAndStart(): void {
    callbacks.onFocus();
    callbacks.onStart();
  }

  function setJoystickFromPointer(event: PointerEvent): void {
    const rect = elements.joystickZone.getBoundingClientRect();
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    const dx = event.clientX - center.x;
    const dy = event.clientY - center.y;
    const distance = Math.hypot(dx, dy);
    const limitedDistance = Math.min(distance, config.joystickRadius);
    const angle = Math.atan2(dy, dx);

    const offset =
      distance === 0
        ? { x: 0, y: 0 }
        : {
            x: Math.cos(angle) * limitedDistance,
            y: Math.sin(angle) * limitedDistance,
          };

    elements.joystickThumb.style.transform = `translate(${offset.x}px, ${offset.y}px)`;

    touchDirection =
      distance < config.joystickDeadZone
        ? { x: 0, y: 0 }
        : {
            x: offset.x / config.joystickRadius,
            y: offset.y / config.joystickRadius,
          };
  }

  function resetJoystick(): void {
    joystickPointerId = null;
    touchDirection = { x: 0, y: 0 };
    elements.joystickBase.classList.remove("is-active");
    elements.joystickThumb.style.transform = "translate(0, 0)";
  }

  function clearPowerHold(): void {
    letargoPointerId = null;
    touchSlowHeld = false;
    elements.letargoZone.classList.remove("is-holding");
  }

  function flashPowerButton(button: HTMLElement): void {
    button.classList.add("did-activate");
    window.setTimeout(() => {
      button.classList.remove("did-activate");
    }, 160);
  }

  elements.joystickZone.addEventListener("pointerdown", (event) => {
    if (callbacks.isSettingsOpen() || joystickPointerId !== null) {
      return;
    }

    event.preventDefault();

    focusAndStart();

    joystickPointerId = event.pointerId;
    elements.joystickZone.setPointerCapture(event.pointerId);
    elements.joystickBase.classList.add("is-active");
    setJoystickFromPointer(event);
  });

  elements.joystickZone.addEventListener("pointermove", (event) => {
    if (event.pointerId !== joystickPointerId) {
      return;
    }

    event.preventDefault();
    setJoystickFromPointer(event);
  });

  elements.joystickZone.addEventListener("pointerup", (event) => {
    if (event.pointerId === joystickPointerId) {
      resetJoystick();
    }
  });

  elements.joystickZone.addEventListener("pointercancel", (event) => {
    if (event.pointerId === joystickPointerId) {
      resetJoystick();
    }
  });

  elements.letargoZone.addEventListener("pointerdown", (event) => {
    if (callbacks.isSettingsOpen() || letargoPointerId !== null) {
      return;
    }

    event.preventDefault();

    focusAndStart();

    letargoPointerId = event.pointerId;
    touchSlowHeld = true;
    elements.letargoZone.setPointerCapture(event.pointerId);
    elements.letargoZone.classList.add("is-holding");
  });

  elements.letargoZone.addEventListener("pointerup", (event) => {
    if (event.pointerId === letargoPointerId) {
      clearPowerHold();
    }
  });

  elements.letargoZone.addEventListener("pointercancel", (event) => {
    if (event.pointerId === letargoPointerId) {
      clearPowerHold();
    }
  });

  elements.destelloButton.addEventListener("pointerdown", (event) => {
    if (callbacks.isSettingsOpen()) {
      return;
    }

    event.preventDefault();
    focusAndStart();
    callbacks.onDash();
    flashPowerButton(elements.destelloButton);
  });

  elements.presagioButton.addEventListener("pointerdown", (event) => {
    if (callbacks.isSettingsOpen()) {
      return;
    }

    event.preventDefault();
    focusAndStart();
    callbacks.onPresagio();
    flashPowerButton(elements.presagioButton);
  });

  return {
    direction() {
      return touchDirection;
    },

    isSlowHeld() {
      return touchSlowHeld;
    },

    resetJoystick,

    clearPowerHold,
  };
}
