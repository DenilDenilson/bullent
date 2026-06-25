# Bullent Power Spec X2: Dash Corto

## Goal

Add the first player power: a short dash triggered with `V`.

## Behavior

- Pressing `V` while `running` moves the player quickly in the current movement direction.
- If no movement key is held, dash uses the last movement direction.
- If no direction exists yet, dash moves upward.
- Dash has no cooldown.
- Dash cannot move the player outside the arena.
- Dash does not make the player invulnerable.

## UI

- Show the dash power as a bubble icon in the bottom-left of the game screen.
- The icon lives in `public/assets/powers/` so future powers can use the same asset structure.
- Hovering the icon shows that the shortcut is `V`.
- The icon is visual/status UI only; keyboard is the activation path for this version.

## Balance

- Dash distance starts at `72px`.
- No JSON config yet.
- No cooldown UI yet.

## Acceptance Criteria

- `V` dashes during active gameplay.
- Holding a movement direction controls dash direction.
- Dash clamps to arena bounds.
- Bubble icon appears bottom-left.
- `pnpm selfcheck` and `pnpm build` pass.
