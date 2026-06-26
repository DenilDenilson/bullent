import type { Vec2 } from "../core.ts";

export type TouchInputConfig = {
  joystickRadius: number;
  joystickDeadZone: number;
  doubleTapWindow: number;
  holdDelay: number;
};

export type TouchInputElements = {
  joystickZone: HTMLElement;
  joystickBase: HTMLElement;
  joystickThumb: HTMLElement;
  powerZone: HTMLElement;
};

export type TouchInputCallbacks = {
  isSettingsOpen: () => boolean;
  onFocus: () => void;
  onStart: () => void;
  onDash: () => void;
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
  let powerPointerId: number | null = null;
  let powerStartedAt = 0;
  let lastPowerTapAt = 0;
  let holdTimer = 0;

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
    window.clearTimeout(holdTimer);
    holdTimer = 0;
    touchSlowHeld = false;
    elements.powerZone.classList.remove("is-holding");
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

  elements.powerZone.addEventListener("pointerdown", (event) => {
    if (callbacks.isSettingsOpen() || powerPointerId !== null) {
      return;
    }

    event.preventDefault();

    focusAndStart();

    powerPointerId = event.pointerId;
    powerStartedAt = performance.now();
    elements.powerZone.setPointerCapture(event.pointerId);
    elements.powerZone.classList.add("is-pressed");

    holdTimer = window.setTimeout(() => {
      touchSlowHeld = true;
      elements.powerZone.classList.add("is-holding");
    }, config.holdDelay);
  });

  elements.powerZone.addEventListener("pointerup", (event) => {
    if (event.pointerId !== powerPointerId) {
      return;
    }

    const now = performance.now();
    const wasHolding = touchSlowHeld;

    powerPointerId = null;
    elements.powerZone.classList.remove("is-pressed");
    clearPowerHold();

    const isQuickTap = now - powerStartedAt < config.holdDelay;
    const isDoubleTap = now - lastPowerTapAt < config.doubleTapWindow;

    if (!wasHolding && isQuickTap && isDoubleTap) {
      callbacks.onDash();
      lastPowerTapAt = 0;

      elements.powerZone.classList.add("did-dash");
      window.setTimeout(() => {
        elements.powerZone.classList.remove("did-dash");
      }, 160);

      return;
    }

    if (!wasHolding) {
      lastPowerTapAt = now;
    }
  });

  elements.powerZone.addEventListener("pointercancel", (event) => {
    if (event.pointerId !== powerPointerId) {
      return;
    }

    powerPointerId = null;
    elements.powerZone.classList.remove("is-pressed");
    clearPowerHold();
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
