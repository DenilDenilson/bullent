# Bullent Level Definition Spec

## Goal

Move level balance out of code and into JSON data, so each level can change player tuning, shooters, bullets, and limits without editing TypeScript.

This spec defines the data shape only. Loading and applying the JSON is a later implementation step.

## Level File

Levels live in one JSON file:

```txt
public/levels.json
```

Shape:

```json
{
  "version": 1,
  "levels": [
    {
      "id": 1,
      "name": "First Contact",
      "arena": {
        "width": 460,
        "height": 560
      },
      "player": {
        "radius": 10,
        "speed": 220
      },
      "bullets": {
        "radius": 5,
        "speed": 180,
        "max": 80
      },
      "shooters": [
        {
          "x": 230,
          "y": 28,
          "cooldown": 0.9
        }
      ]
    }
  ]
}
```

## Field Rules

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | number | Level file format version. Starts at `1`. |
| `levels` | array | Ordered list of playable levels. |
| `id` | number | Stable level number. |
| `name` | string | Human-readable level name. |
| `arena.width` | number | Logical canvas width in pixels. |
| `arena.height` | number | Logical canvas height in pixels. |
| `player.radius` | number | Player collision/render radius in pixels. |
| `player.speed` | number | Player speed in pixels per second. |
| `bullets.radius` | number | Bullet collision/render radius in pixels. |
| `bullets.speed` | number | Bullet speed in pixels per second. |
| `bullets.max` | number | Max bullets accumulated at once. |
| `shooters[].x` | number | Shooter X position in arena pixels. |
| `shooters[].y` | number | Shooter Y position in arena pixels. |
| `shooters[].cooldown` | number | Seconds between shots for that shooter. |

## Validation Rules

- `version` must be `1`.
- `levels` must contain at least one level.
- Each level must contain at least one shooter.
- Numeric values must be positive.
- Shooter positions must be inside the arena.
- `bullets.max` must be at least the shooter count.

## Intentional Limits

- No finite level duration in survival mode.
- No per-shooter bullet speed yet.
- No bullet lifetime yet.
- No shooter movement yet.
- No spawn patterns yet.
- No mobile controls, themes, power-ups, or boss behavior here.

If those become necessary, add fields only when the gameplay needs them.
