# Bullent Screen Spec 6: Pantalla de Inicio

## Goal

Replace the current bare `ready` screen with a polished start screen that explains what Bullent is, how to play, and which powers exist, without showing a live game preview.

The screen should feel like an arcade portfolio piece: glassmorphism, condensed gaming typography, neon accents, and a greener primary color that can be changed easily later.

## Scope

- Applies only to the `ready` state.
- Does not change gameplay rules.
- Does not implement new powers.
- Keeps the existing `Click / Enter` start behavior.
- Keeps the settings gear available.
- Does not add a game preview panel.

## Layout

The start screen is a DOM overlay above the canvas/game shell.

Required structure:

- Top metadata row:
  - left chip: `BEST {time}`;
  - right chip: build/status label, e.g. `MVP BUILD`.
- Main title block:
  - large `BULLENT` wordmark;
  - small byline: `BY DENIL`;
  - short tagline: `ESQUIVA EL CAOS. ROMPE TU RECORD.`
- Controls strip:
  - compact glass row;
  - label: `MOVIMIENTO`;
  - keys: `WASD`;
  - keys: arrow cluster;
  - copy: `moverte por la arena`.
- Powers section:
  - vertical list;
  - no grid;
  - no carousel;
  - no game preview.
- Bottom CTA:
  - large pill button/label: `CLICK / ENTER - INICIAR`.

Do not add a separate objective box.

## Powers List

Show only current player powers plus one future power.

| Status | Power | Shortcut / Label | Description |
| --- | --- | --- | --- |
| Implemented | `Destello` | `V` | Reposicion rapida hacia tu direccion actual. |
| Implemented | `Letargo` | `CTRL` | Ralentiza la simulacion mientras tengas energia. |
| Future | `Presagio` | `COMING SOON` | Revela trayectorias de balas por un instante. |

No enemy powers on the start screen.

## Visual Direction

- Style: glassmorphism.
- Main color: green/cyan leaning, not purple-first.
- Background:
  - dark;
  - subtle grid or panel depth;
  - no visible gameplay preview.
- Panel:
  - translucent dark glass;
  - thin neon border;
  - soft inner glow.
- Typography:
  - condensed, bold, gaming/editorial feel;
  - title should be heavy and wide;
  - body copy should stay readable.
- Power cards:
  - vertical cards;
  - icon on the left;
  - title and short text in the middle;
  - shortcut/status pill on the right.
- Use the existing power icons from `public/assets/powers/` where possible.

## Theme Tokens

The implementation should define a small set of CSS variables so the main color is easy to change:

```css
--theme-primary
--theme-primary-soft
--theme-primary-strong
--theme-glass
--theme-border
--theme-text
--theme-muted
```

These variables should live near the existing Tailwind/CSS entrypoint and be used by the start screen styles.

## Interaction

- Click on CTA or canvas starts the game.
- `Enter` starts the game.
- Settings gear opens the existing level settings panel.
- Power cards are informational only.
- The future `Presagio` card must look disabled/upcoming.

## Acceptance Criteria

- `ready` screen explains the game without requiring README context.
- No live game preview is visible behind the start content.
- Powers appear as a vertical list.
- Only one future power is shown: `Presagio`.
- No separate objective box exists.
- The visual language is glassmorphism with greener primary accents.
- Main color can be changed by editing CSS variables.
- `pnpm selfcheck` and `pnpm build` pass after implementation.
