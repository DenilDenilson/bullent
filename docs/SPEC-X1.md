# Bullent Correction Spec X1

## Goal

Correct the MVP loop from finite-level victory to endless survival: the objective is to last as long as possible, record the best time, and keep level tuning available from all non-running setup/result screens.

## Corrections

- Remove finite win-by-duration behavior.
- Replace countdown display with elapsed survival time.
- When the player is hit, show a survived summary instead of a simple loss message.
- Store the best survived time locally in the browser.
- Show current run time and best record in the HUD.
- Keep the settings gear visible on:
  - `ready`
  - survived summary after a hit.
- Move the settings gear from top-right to bottom-right.

## Level Config Impact

- `duration` is no longer an active gameplay parameter.
- Existing JSON may still contain `duration`; runtime should ignore it for backward compatibility.
- The in-game settings panel must not expose `duration`.

## Record Rules

- Best record is measured in seconds.
- Best record updates when a run ends and survived time is greater than the stored best.
- Best record persists via `localStorage`.
- If `localStorage` is unavailable, the game still works with an in-memory best for the current session.

## Acceptance Criteria

- A run never ends by timer.
- Player death ends the run and displays survived time.
- The best record survives page refresh in a normal browser.
- Settings gear is bottom-right on `ready` and survived summary.
- Settings gear is hidden while `running`.
- `pnpm selfcheck` and `pnpm build` pass.
