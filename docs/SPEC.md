# Bullent MVP Spec

## Goal

Bullent v0 is a small embeddable browser game: survive as long as possible by dodging bouncing bullets in a fixed arena.

## Player Contract

- The player starts centered in a `460x560` logical arena.
- The player moves with `WASD` or arrow keys.
- Click, `Enter`, or `Space` starts from `ready` and restarts from `dead`.
- Touching any bullet ends the run immediately.
- The best survived time is recorded locally.

## Game States

| State | Meaning |
| --- | --- |
| `ready` | Waiting to start. |
| `running` | Timer, movement, shooting, bullets, and collisions are active. |
| `dead` | The player touched a bullet and sees the survived summary. |

## Balance Constants

| Constant | Value |
| --- | ---: |
| Arena width | `460` |
| Arena height | `560` |
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
- A run never ends by timer.
- `pnpm selfcheck` validates the core movement, bounce, collision, and shooter math.
- `pnpm build` completes successfully.
