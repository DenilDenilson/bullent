import { readFileSync } from "node:fs";
import {
  createAutoplayBot,
  defaultBotTuning,
  type BotTuning,
} from "./bot.ts";
import { parseLevelFile } from "./core.ts";
import { parsePowersConfig } from "./powers/index.ts";
import {
  activatePresagioGameSession,
  createGameSession,
  dashGameSession,
  getSessionScoreTime,
  updateGameSession,
} from "./session.ts";

const defaultTrials = 60;
const defaultRuns = 10;
const defaultMaxSeconds = 180;
const defaultSeed = 2026;
const fixedDt = 1 / 60;
const dashDeathWindowFrames = 10;

type TuneOptions = {
  trials: number;
  runs: number;
  maxSeconds: number;
  seed: number;
};

type RunResult = {
  score: number;
  capped: boolean;
  pickups: number;
  dashes: number;
  presagios: number;
  letargoSeconds: number;
  diedAfterDash: boolean;
};

type CandidateResult = {
  index: number;
  tuning: BotTuning;
  fitness: number;
  avgScore: number;
  medianScore: number;
  p90Score: number;
  cappedCount: number;
  dashDeathCount: number;
  avgPickups: number;
  avgDashes: number;
  avgPresagios: number;
  avgLetargoSeconds: number;
};

const options = parseOptions(process.argv.slice(2));
const levelFile = parseLevelFile(
  JSON.parse(readFileSync("public/levels.json", "utf8")),
);
const powers = parsePowersConfig(
  JSON.parse(readFileSync("public/powers.json", "utf8")),
);
const level = levelFile.levels[0];

if (!level) {
  throw new Error("No levels found in public/levels.json");
}

const results = runTune(options);
printTuneSummary(results, options);

function runTune(options: TuneOptions): CandidateResult[] {
  const random = createSeededRandom(options.seed);
  const results: CandidateResult[] = [];

  for (let index = 0; index < options.trials; index += 1) {
    const tuning =
      index === 0 ? defaultBotTuning : randomTuning(defaultBotTuning, random);

    results.push(evaluateCandidate(index + 1, tuning, options));
  }

  return results.sort((a, b) => b.fitness - a.fitness);
}

function evaluateCandidate(
  index: number,
  tuning: BotTuning,
  options: TuneOptions,
): CandidateResult {
  const runs: RunResult[] = [];

  for (let runIndex = 0; runIndex < options.runs; runIndex += 1) {
    runs.push(
      runOne(tuning, options.seed + index * 10_000 + runIndex, options.maxSeconds),
    );
  }

  const scores = runs.map((run) => run.score).sort((a, b) => a - b);
  const cappedCount = runs.filter((run) => run.capped).length;
  const dashDeathCount = runs.filter((run) => run.diedAfterDash).length;
  const avgScore = average(scores);

  return {
    index,
    tuning,
    // ponytail: simple scalar fitness; upgrade to multi-objective selection if needed.
    fitness: avgScore - (dashDeathCount / options.runs) * 240,
    avgScore,
    medianScore: percentile(scores, 0.5),
    p90Score: percentile(scores, 0.9),
    cappedCount,
    dashDeathCount,
    avgPickups: average(runs.map((run) => run.pickups)),
    avgDashes: average(runs.map((run) => run.dashes)),
    avgPresagios: average(runs.map((run) => run.presagios)),
    avgLetargoSeconds: average(runs.map((run) => run.letargoSeconds)),
  };
}

function runOne(
  tuning: BotTuning,
  seed: number,
  maxSeconds: number,
): RunResult {
  return withSeededRandom(seed, () => {
    const session = createGameSession({ level, powers, state: "running" });
    const bot = createAutoplayBot(tuning);
    let realSeconds = 0;
    let pickups = 0;
    let dashes = 0;
    let presagios = 0;
    let letargoSeconds = 0;
    let framesSinceDash = Number.POSITIVE_INFINITY;
    let diedAfterDash = false;

    while (session.state === "running" && realSeconds < maxSeconds) {
      const input = bot.think(session, fixedDt);

      if (input.usePresagio) {
        activatePresagioGameSession(session);
        presagios += 1;
      }

      if (input.useDash) {
        dashGameSession(session, input.direction);
        dashes += 1;
        framesSinceDash = 0;
      }

      const result = updateGameSession(session, {
        rawDt: fixedDt,
        direction: input.direction,
        slowHeld: input.slowHeld,
      });

      realSeconds += fixedDt;

      if (result.collectedTimePickup) {
        pickups += 1;
      }

      if (session.letargo.active) {
        letargoSeconds += fixedDt;
      }

      if (result.died) {
        diedAfterDash = framesSinceDash <= dashDeathWindowFrames;
        break;
      }

      framesSinceDash += 1;
    }

    return {
      score: getSessionScoreTime(session),
      capped: session.state === "running",
      pickups,
      dashes,
      presagios,
      letargoSeconds,
      diedAfterDash,
    };
  });
}

function randomTuning(base: BotTuning, random: () => number): BotTuning {
  const safePickupWeight = randomBetween(0.7, 1.3, random);
  const mediumPickupWeight = randomBetween(
    0.32,
    Math.min(0.9, safePickupWeight),
    random,
  );
  const crowdedPickupWeight = randomBetween(
    0.12,
    Math.min(0.55, mediumPickupWeight),
    random,
  );
  const dangerPickupWeight = randomBetween(
    0.04,
    Math.min(0.3, crowdedPickupWeight),
    random,
  );

  return {
    ...base,
    botDashCooldown: randomBetween(0.75, 1.8, random),
    letargoDangerThreshold: randomBetween(0.2, 0.8, random),
    presagioDangerThreshold: randomBetween(0.25, 0.95, random),
    presagioBulletThreshold: Math.round(randomBetween(6, 20, random)),
    dashDangerThreshold: randomBetween(0.35, 1.4, random),
    dashSafetyRatio: randomBetween(0.02, 0.18, random),
    bulletDangerMargin: randomBetween(28, 70, random),
    bulletDangerWeight: randomBetween(2, 9, random),
    dangerPickupWeight,
    crowdedPickupWeight,
    mediumPickupWeight,
    safePickupWeight,
  };
}

function printTuneSummary(
  results: CandidateResult[],
  options: TuneOptions,
): void {
  const best = results[0];

  if (!best) {
    throw new Error("No tuning results");
  }

  console.log("Bullent bot tuning");
  console.log(
    `trials=${options.trials} runs=${options.runs} maxSeconds=${options.maxSeconds}s seed=${options.seed}`,
  );
  console.log("");
  console.log("top candidates");

  for (const [rank, result] of results.slice(0, 5).entries()) {
    console.log(
      `#${rank + 1} trial=${result.index} fitness=${result.fitness.toFixed(2)} ` +
        `avg=${formatSeconds(result.avgScore)} median=${formatSeconds(result.medianScore)} ` +
        `p90=${formatSeconds(result.p90Score)} capped=${result.cappedCount}/${options.runs} ` +
        `dashDeaths=${result.dashDeathCount}/${options.runs} pickups=${result.avgPickups.toFixed(1)} ` +
        `dash=${result.avgDashes.toFixed(1)} presagio=${result.avgPresagios.toFixed(1)} ` +
        `letargo=${formatSeconds(result.avgLetargoSeconds)}`,
    );
  }

  console.log("");
  console.log("copy this into defaultBotTuning");
  console.log(formatTuning(best.tuning));
}

function formatTuning(tuning: BotTuning): string {
  const lines = Object.entries(tuning).map(([key, value]) => {
    const formatted = Number.isInteger(value)
      ? String(value)
      : Number(value).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");

    return `  ${key}: ${formatted},`;
  });

  return `export const defaultBotTuning: BotTuning = {\n${lines.join("\n")}\n};`;
}

function parseOptions(args: string[]): TuneOptions {
  return {
    trials: parsePositiveIntegerFlag(args, "--trials", defaultTrials),
    runs: parsePositiveIntegerFlag(args, "--runs", defaultRuns),
    maxSeconds: parsePositiveNumberFlag(args, "--max-seconds", defaultMaxSeconds),
    seed: parsePositiveIntegerFlag(args, "--seed", defaultSeed),
  };
}

function parsePositiveIntegerFlag(
  args: string[],
  name: string,
  fallback: number,
): number {
  const value = parsePositiveNumberFlag(args, name, fallback);

  return Math.trunc(value);
}

function parsePositiveNumberFlag(
  args: string[],
  name: string,
  fallback: number,
): number {
  const index = args.indexOf(name);

  if (index === -1) return fallback;

  const value = Number(args[index + 1]);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }

  return value;
}

function withSeededRandom<T>(seed: number, run: () => T): T {
  const originalRandom = Math.random;
  const random = createSeededRandom(seed);

  Math.random = random;

  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    // ponytail: deterministic LCG is enough for repeatable tuning runs.
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomBetween(
  min: number,
  max: number,
  random: () => number,
): number {
  return min + (max - min) * random();
}

function average(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(sortedValues: number[], ratio: number): number {
  if (sortedValues.length === 0) return 0;

  const index = Math.round((sortedValues.length - 1) * ratio);

  return sortedValues[index] ?? 0;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(2)}s`;
}
