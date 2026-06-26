import {
  movePlayer,
  type LevelConfig,
  type Player,
  type Vec2,
} from "../core.ts";

export type DestelloConfig = {
  distance: number;
};

export function applyDestello(
  player: Player,
  direction: Vec2,
  level: LevelConfig,
  config: DestelloConfig,
): Player {
  return movePlayer(player, direction, config.distance / player.speed, level);
}
