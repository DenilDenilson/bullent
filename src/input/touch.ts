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
  let joystickOrigin: Vec2 | null = null;
  let letargoPointerId: number | null = null;

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
