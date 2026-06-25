# Bullent Power Spec 5: Camara Lenta

## Goal

Add the second player power: hold `Ctrl` to slow global game time temporarily.

## Behavior

- Holding `Ctrl` while `running` activates slow motion.
- Releasing `Ctrl` deactivates slow motion.
- Slow motion affects the full gameplay simulation:
  - player movement;
  - bullet movement;
  - shooter timers;
  - survival timer / record counter.
- Slow motion cannot be activated outside `running`.
- Slow motion is a reflex tool: it gives the player more real-world reaction time, but the in-game clock also advances slower.

## Energy Model

- Maximum slow motion energy is configurable, default `3s`.
- Energy drains in real time while `Ctrl` is held and slow motion is active.
- If the player releases `Ctrl` before energy reaches `0`, the used amount recharges over the same amount of time.
  - Example: using `1s` takes `1s` to recharge back to full.
- If the player holds `Ctrl` until the full `3s` are consumed:
  - slow motion turns off immediately;
  - the power enters a `5s` cooldown;
  - after cooldown, energy starts available again at full `3s`.
- Pressing `Ctrl` during cooldown does nothing.

## Slow Motion Tuning

- Gameplay uses a configurable time scale while slow motion is active.
- Default time scale: `0.45`.
- The raw browser frame delta remains real time.
- The game applies scaled delta to simulation systems:
  - player movement;
  - bullet movement;
  - shooter cooldown accumulation;
  - elapsed survival time.
- Bullet and player speeds are not permanently changed; only per-frame simulation delta is scaled.

## Internal Config

Power tuning must live in JSON, but not in the level configurator UI.

File:

```txt
public/powers.json
```

Shape:

```json
{
  "version": 1,
  "slowMotion": {
    "maxEnergy": 3,
    "cooldown": 5,
    "timeScale": 0.45,
    "rechargeRate": 1
  }
}
```

Field meanings:

| Field | Meaning |
| --- | --- |
| `maxEnergy` | Maximum hold time in real seconds. |
| `cooldown` | Real seconds locked after full depletion. |
| `timeScale` | Simulation delta multiplier while active. |
| `rechargeRate` | Energy recovered per real second when not active and not in cooldown. |

Validation:

- `version` must be `1`.
- `maxEnergy`, `cooldown`, and `rechargeRate` must be positive.
- `timeScale` must be greater than `0` and less than `1`.
- If loading fails, use built-in defaults and keep the game playable.

## UI

- Show camera lenta as a second power bubble in the bottom-left power bar.
- Use an icon asset in:

```txt
public/assets/powers/
```

- Hovering the icon shows `Camara lenta: Ctrl`.
- The icon must communicate current status with a familiar radial recharge pattern:
  - full bubble when energy is full;
  - a gray radial wedge/overlay grows as energy is consumed;
  - while recharging, the gray overlay shrinks back toward full color;
  - when fully depleted and in cooldown, the bubble is dark gray/disabled;
  - during cooldown, a radial fill indicates progress toward availability.
- The UI should be compact and match the dash bubble style.
- The bubble remains visible while running so the player can read availability at a glance.

## Keyboard / Accessibility

- Use the `Control` key.
- Left and right `Ctrl` both work.
- Holding `Ctrl` inside settings inputs must not activate slow motion.
- The browser should not trigger game behavior when the settings panel is open.

## Intentional Limits

- No level configurator controls for power tuning.
- No enemy slow motion exceptions yet.
- No sound effect yet.
- No stacked powers logic beyond dash + camera lenta.
- No mobile/touch activation yet.

## Acceptance Criteria

- Holding `Ctrl` slows global simulation while energy remains.
- Player, bullets, shooters, and survival timer use scaled time.
- Releasing early starts proportional recharge.
- Full depletion triggers a `5s` cooldown.
- After cooldown, slow motion becomes available again.
- Tuning loads from `public/powers.json` with defaults fallback.
- UI bubble shows drain, recharge, and cooldown states.
- Power bubble appears beside dash.
- `pnpm selfcheck` and `pnpm build` pass after implementation.
