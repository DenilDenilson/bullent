import type { Vec2 } from "../core.ts";

export type KeyboardInput = {
  direction: () => Vec2;
  isPressed: (key: string) => boolean;
  isKeyboardPreferred: () => boolean;
};

export type KeyboardInputCallbacks = {
  isSettingsOpen: () => boolean;
  onKeyboardPreferredChange: () => void;
  onEscape: () => void;
  onDash: () => void;
  onStart: () => void;
  onPresagio: () => void;
};

const preventedKeys = new Set([
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
  " ",
  "spacebar",
]);

function isStartKey(key: string): boolean {
  return key === "enter" || key === " " || key === "spacebar";
}

function shouldIgnoreTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("button, input, form"))
  );
}

export function createKeyboardInput(
  callbacks: KeyboardInputCallbacks,
): KeyboardInput {
  const keys = new Set<string>();
  let keyboardPreferred = false;

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    keyboardPreferred = true;
    callbacks.onKeyboardPreferredChange();

    if (callbacks.isSettingsOpen()) {
      if (key === "escape") {
        event.preventDefault();
        callbacks.onEscape();
      }

      return;
    }

    if (shouldIgnoreTarget(event.target)) {
      return;
    }

    if (preventedKeys.has(key)) {
      event.preventDefault();
    }

    if (key === "v") {
      event.preventDefault();
      callbacks.onDash();
    }

    if (key === "c") {
      event.preventDefault();
      callbacks.onPresagio();
    }

    if (isStartKey(key)) {
      callbacks.onStart();
    }

    keys.add(key);
  });

  window.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  return {
    direction() {
      return {
        x:
          Number(keys.has("arrowright") || keys.has("d")) -
          Number(keys.has("arrowleft") || keys.has("a")),
        y:
          Number(keys.has("arrowdown") || keys.has("s")) -
          Number(keys.has("arrowup") || keys.has("w")),
      };
    },

    isPressed(key: string) {
      return keys.has(key.toLowerCase());
    },

    isKeyboardPreferred() {
      return keyboardPreferred;
    },
  };
}
