import {
  parseLevelFile,
  type LevelConfig,
} from "./core.ts";
import { requireValue } from "./dom.ts";
import { numberValue } from "./utils.ts";

export type SettingsInputs = {
  name: HTMLInputElement;
  arenaWidth: HTMLInputElement;
  arenaHeight: HTMLInputElement;
  playerRadius: HTMLInputElement;
  playerSpeed: HTMLInputElement;
  bulletRadius: HTMLInputElement;
  bulletSpeed: HTMLInputElement;
  bulletMax: HTMLInputElement;
};

export function shooterRowHtml(shooter: LevelConfig["shooters"][number]): string {
  return `
    <div class="shooter-row">
      <label>
        X
        <input class="shooter-x" type="number" min="1" step="1" value="${shooter.x}" />
      </label>
      <label>
        Y
        <input class="shooter-y" type="number" min="1" step="1" value="${shooter.y}" />
      </label>
      <label>
        Cooldown
        <input class="shooter-cooldown" type="number" min="0.1" step="0.1" value="${shooter.cooldown}" />
      </label>
      <button class="remove-shooter" type="button">Remove</button>
    </div>
  `;
}

export function populateSettingsForm(args: {
  source: LevelConfig;
  inputs: SettingsInputs;
  shootersList: HTMLElement;
}): void {
  const { source, inputs, shootersList } = args;

  inputs.name.value = source.name;
  inputs.arenaWidth.value = String(source.arena.width);
  inputs.arenaHeight.value = String(source.arena.height);
  inputs.playerRadius.value = String(source.player.radius);
  inputs.playerSpeed.value = String(source.player.speed);
  inputs.bulletRadius.value = String(source.bullets.radius);
  inputs.bulletSpeed.value = String(source.bullets.speed);
  inputs.bulletMax.value = String(source.bullets.max);

  shootersList.innerHTML = source.shooters.map(shooterRowHtml).join("");
}

export function readLevelFromSettingsForm(args: {
  currentLevel: LevelConfig;
  inputs: SettingsInputs;
  shootersList: HTMLElement;
}): LevelConfig {
  const { currentLevel, inputs, shootersList } = args;

  const shooters = [...shootersList.querySelectorAll<HTMLElement>(".shooter-row")].map((row) => ({
    x: numberValue(requireValue(row.querySelector<HTMLInputElement>(".shooter-x"), "Missing shooter x")),
    y: numberValue(requireValue(row.querySelector<HTMLInputElement>(".shooter-y"), "Missing shooter y")),
    cooldown: numberValue(requireValue(row.querySelector<HTMLInputElement>(".shooter-cooldown"), "Missing shooter cooldown")),
  }));

  const parsed = parseLevelFile({
    version: 1,
    levels: [
      {
        id: currentLevel.id,
        name: inputs.name.value,
        arena: {
          width: numberValue(inputs.arenaWidth),
          height: numberValue(inputs.arenaHeight),
        },
        player: {
          radius: numberValue(inputs.playerRadius),
          speed: numberValue(inputs.playerSpeed),
        },
        bullets: {
          radius: numberValue(inputs.bulletRadius),
          speed: numberValue(inputs.bulletSpeed),
          max: numberValue(inputs.bulletMax),
        },
        shooters,
      },
    ],
  });

  return parsed.levels[0] ?? currentLevel;
}