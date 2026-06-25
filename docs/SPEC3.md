# Bullent In-Game Level Config Spec

## Goal

Add a settings gear to the `ready` and survived summary screens so the player can tune the current level from the game UI, using the same active parameters that exist in `public/levels.json`.

The UI must feel like part of Bullent: compact, dark, neon-accented, keyboard-friendly, and not like a separate admin panel.

## Entry Points

- Show a gear button on screen only when the game state is:
  - `ready`
  - `dead`, shown to the player as survived summary.
- Do not show the gear while `running`.
- The gear opens a modal/panel over the canvas.
- Closing the panel returns to the previous state without starting the game.

## Editable Fields

The panel edits a draft copy of the active level:

| UI Label | JSON Field | Control |
| --- | --- | --- |
| Name | `name` | text input |
| Arena width | `arena.width` | number input |
| Arena height | `arena.height` | number input |
| Player radius | `player.radius` | number input |
| Player speed | `player.speed` | number input |
| Bullet radius | `bullets.radius` | number input |
| Bullet speed | `bullets.speed` | number input |
| Max bullets | `bullets.max` | number input |
| Shooters | `shooters[]` | repeated rows |
| Shooter X | `shooters[].x` | number input |
| Shooter Y | `shooters[].y` | number input |
| Shooter cooldown | `shooters[].cooldown` | number input |

Shooter controls:

- Add shooter.
- Remove shooter.
- Keep at least one shooter.

## Actions

| Action | Behavior |
| --- | --- |
| Apply | Validate draft, replace active level, reset game to `ready`. |
| Cancel | Discard draft and close panel. |
| Reset | Restore active level from the originally loaded JSON level. |

No persistence in v1:

- Changes live only in memory.
- Refreshing the page reloads `public/levels.json`.
- No localStorage for level settings yet.
- No writing back to JSON from the browser.

## Validation

Reuse the same level validation rules as `SPEC2.md`:

- Numeric values must be positive.
- At least one shooter.
- Shooter positions must be inside the arena.
- `bullets.max` must be at least the shooter count.

When validation fails:

- Do not apply changes.
- Show one short inline error inside the panel.
- Keep the draft values so the player can fix them.

## Visual Requirements

- Gear button:
  - icon-only button.
  - bottom-right inside the canvas overlay.
  - visible on `ready` and survived summary.
  - hover/focus state uses cyan or violet accent.
- Panel:
  - dark translucent surface.
  - max width fits inside the canvas on desktop.
  - scrolls internally if content is taller than the arena.
  - small labels and compact inputs.
  - no marketing copy or instructions.
- Buttons:
  - `Apply` as primary.
  - `Cancel` and `Reset` as secondary.

## Keyboard / Accessibility

- Gear button is focusable.
- `Esc` closes the panel.
- `Enter` inside inputs does not start the game.
- While the panel is open, game start/restart shortcuts are ignored.
- Inputs have accessible labels.

## Implementation Notes

- Keep `public/levels.json` as the source of default level data.
- Maintain two level values in runtime:
  - `baseLevel`: the loaded JSON level.
  - `activeLevel`: the currently playable level.
- Opening the panel copies `activeLevel` into a draft.
- Applying validates the draft using the same parser/validation path as loaded JSON.
- The renderer should draw the game canvas as usual, then draw DOM UI above it.
- Prefer one small DOM overlay next to the canvas, not canvas-drawn form controls.

## Intentional Limits

- No save-to-file.
- No localStorage for level settings.
- No level selector.
- No import/export JSON.
- No mobile-specific editor layout beyond responsive fitting.
- No styling/theme editor.
