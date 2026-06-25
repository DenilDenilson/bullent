# Bullent MVP Spec

## Goal

Bullent v0 is a small embeddable browser game: survive one 30 second level by dodging bouncing bullets in a fixed arena.

## Player Contract

- The player starts centered in a `460x560` logical arena.
- The player moves with `WASD` or arrow keys.
- Click, `Enter`, or `Space` starts from `ready` and restarts from `dead` or `won`.
- Touching any bullet ends the run immediately.
- Surviving until the timer reaches zero wins the run.

## Game States

| State | Meaning |
| --- | --- |
| `ready` | Waiting to start. |
| `running` | Timer, movement, shooting, bullets, and collisions are active. |
| `dead` | The player touched a bullet. |
| `won` | The player survived the full level duration. |

## Balance Constants

| Constant | Value |
| --- | ---: |
| Arena width | `460` |
| Arena height | `560` |
| Level duration | `30s` |
| Player radius | `10px` |
| Player speed | `220px/s` |
| Bullet radius | `5px` |
| Bullet speed | `180px/s` |
| Shooter cooldown | `900ms` |
| Max bullets | `80` |

## Acceptance Criteria

- The game renders sharply on high-DPI screens using `devicePixelRatio`.
- The player cannot leave the arena.
- Bullets bounce off all arena walls.
- The shooter aims at the player's current position when each bullet is created.
- The run can be started and restarted without refreshing the page.
- `pnpm selfcheck` validates the core movement, bounce, collision, and shooter math.
- `pnpm build` completes successfully.
