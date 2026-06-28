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

const powerHoldDelayMs = 290;
const powerDoubleTapDelayMs = 240;

export function createTouchInput(args: {
  elements: TouchInputElements;
  config: TouchInputConfig;
  callbacks: TouchInputCallbacks;
}): TouchInput {
  const { elements, config, callbacks } = args;

  let touchDirection: Vec2 = { x: 0, y: 0 };
  let touchSlowHeld = false;
  let joystickPointerId: number | null = null;
  let joystickOrigin: Vec2 | null = null;
  let powerPointerId: number | null = null;
  let powerHoldTimer: number | null = null;
  let powerSingleTapTimer: number | null = null;
  let lastPowerTapAt = 0;

  function focusAndStart(): void {
    callbacks.onFocus();
    callbacks.onStart();
  }

  function setJoystickFromPointer(event: PointerEvent): void {
    if (!joystickOrigin) {
      return;
    }

    let dx = event.clientX - joystickOrigin.x;
    let dy = event.clientY - joystickOrigin.y;
    let distance = Math.hypot(dx, dy);

    // ponytail: floating joystick slides only after reaching max radius.
    if (distance > config.joystickRadius) {
      const angle = Math.atan2(dy, dx);
      const offset = {
        x: Math.cos(angle) * config.joystickRadius,
        y: Math.sin(angle) * config.joystickRadius,
      };

      joystickOrigin = {
        x: event.clientX - offset.x,
        y: event.clientY - offset.y,
      };
      dx = offset.x;
      dy = offset.y;
      distance = config.joystickRadius;
    }

    positionJoystickBase();

    elements.joystickThumb.style.transform = `translate(${dx}px, ${dy}px)`;

    touchDirection =
      distance < config.joystickDeadZone
        ? { x: 0, y: 0 }
        : {
            x: dx / config.joystickRadius,
            y: dy / config.joystickRadius,
          };
  }

  function positionJoystickBase(): void {
    if (!joystickOrigin) {
      return;
    }

    const rect = elements.joystickZone.getBoundingClientRect();

    elements.joystickBase.style.left = `${joystickOrigin.x - rect.left}px`;
    elements.joystickBase.style.top = `${joystickOrigin.y - rect.top}px`;
    elements.joystickBase.style.right = "auto";
    elements.joystickBase.style.transform = "translate(-50%, -50%)";
  }

  function resetJoystick(): void {
    joystickPointerId = null;
    joystickOrigin = null;
    touchDirection = { x: 0, y: 0 };
    elements.joystickBase.classList.remove("is-active");
    elements.joystickBase.style.left = "";
    elements.joystickBase.style.top = "";
    elements.joystickBase.style.right = "";
    elements.joystickBase.style.transform = "";
    elements.joystickThumb.style.transform = "translate(0, 0)";
  }

  function clearPowerHold(): void {
    powerPointerId = null;
    touchSlowHeld = false;
    elements.powerPad.classList.remove("is-holding");

    if (powerHoldTimer !== null) {
      window.clearTimeout(powerHoldTimer);
      powerHoldTimer = null;
    }
  }

  function clearPendingSingleTap(): void {
    if (powerSingleTapTimer === null) {
      return;
    }

    window.clearTimeout(powerSingleTapTimer);
    powerSingleTapTimer = null;
  }

  function flashPowerPad(action: "presagio" | "destello"): void {
    elements.powerPad.dataset.action = action;
    window.setTimeout(() => {
      if (elements.powerPad.dataset.action === action) {
        delete elements.powerPad.dataset.action;
      }
    }, 180);
  }

  function schedulePowerTap(): void {
    const now = performance.now();

    if (now - lastPowerTapAt <= powerDoubleTapDelayMs) {
      lastPowerTapAt = 0;
      clearPendingSingleTap();
      callbacks.onDash();
      flashPowerPad("destello");
      return;
    }

    lastPowerTapAt = now;
    clearPendingSingleTap();
    powerSingleTapTimer = window.setTimeout(() => {
      powerSingleTapTimer = null;
      callbacks.onPresagio();
      flashPowerPad("presagio");
    }, powerDoubleTapDelayMs);
  }

  elements.joystickZone.addEventListener("pointerdown", (event) => {
    if (callbacks.isSettingsOpen() || joystickPointerId !== null) {
      return;
    }

    event.preventDefault();

    focusAndStart();

    joystickPointerId = event.pointerId;
    joystickOrigin = { x: event.clientX, y: event.clientY };
    elements.joystickZone.setPointerCapture(event.pointerId);
    positionJoystickBase();
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

  elements.powerPad.addEventListener("pointerdown", (event) => {
    if (callbacks.isSettingsOpen() || powerPointerId !== null) {
      return;
    }

    event.preventDefault();

    focusAndStart();

    clearPendingSingleTap();
    powerPointerId = event.pointerId;
    elements.powerPad.setPointerCapture(event.pointerId);
    powerHoldTimer = window.setTimeout(() => {
      lastPowerTapAt = 0;
      touchSlowHeld = true;
      elements.powerPad.classList.add("is-holding");
    }, powerHoldDelayMs);
  });

  elements.powerPad.addEventListener("pointerup", (event) => {
    if (event.pointerId !== powerPointerId) {
      return;
    }

    event.preventDefault();
    const wasHolding = touchSlowHeld;

    clearPowerHold();

    if (!wasHolding) {
      schedulePowerTap();
    }
  });

  elements.powerPad.addEventListener("pointercancel", (event) => {
    if (event.pointerId === powerPointerId) {
      clearPowerHold();
    }
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
