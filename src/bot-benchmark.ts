import { readFileSync } from "node:fs";
import { createAutoplayBot } from "./bot.ts";
import { parseLevelFile } from "./core.ts";
import { parsePowersConfig } from "./powers/index.ts";
import {
  activatePresagioGameSession,
  createGameSession,
  dashGameSession,
  getSessionScoreTime,
  updateGameSession,
} from "./session.ts";

const defaultRuns = 50;
const defaultMaxSeconds = 120;
const defaultSeed = 1337;
const fixedDt = 1 / 60;
const dashDeathWindowFrames = 10;

type BenchmarkOptions = {
  runs: number;
  maxSeconds: number;
  seed: number;
};

type RunResult = {
  index: number;
  seed: number;
  score: number;
  realSeconds: number;
  capped: boolean;
  pickups: number;
  dashes: number;
  presagios: number;
  letargoSeconds: number;
  bulletsAtEnd: number;
  diedAfterDash: boolean;
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

const results = runBenchmark(options);
printSummary(results, options);

function runBenchmark(options: BenchmarkOptions): RunResult[] {
  const results: RunResult[] = [];

  for (let index = 0; index < options.runs; index += 1) {
    results.push(runOne(index + 1, options.seed + index, options.maxSeconds));
  }

  return results;
}

function runOne(index: number, seed: number, maxSeconds: number): RunResult {
  return withSeededRandom(seed, () => {
    const session = createGameSession({ level, powers, state: "running" });
    const bot = createAutoplayBot();
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
      index,
      seed,
      score: getSessionScoreTime(session),
      realSeconds,
      capped: session.state === "running",
      pickups,
      dashes,
      presagios,
      letargoSeconds,
      bulletsAtEnd: session.bullets.length,
      diedAfterDash,
    };
  });
}

function printSummary(results: RunResult[], options: BenchmarkOptions): void {
  const scores = results.map((result) => result.score).sort((a, b) => a - b);
  const cappedCount = results.filter((result) => result.capped).length;
  const dashDeathCount = results.filter((result) => result.diedAfterDash).length;

  console.log("Bullent bot benchmark");
  console.log(
    `runs=${options.runs} maxSeconds=${options.maxSeconds}s seed=${options.seed}`,
  );
  console.log("");
  console.log(`score avg    ${formatSeconds(average(scores))}`);
  console.log(`score median ${formatSeconds(percentile(scores, 0.5))}`);
  console.log(`score p90    ${formatSeconds(percentile(scores, 0.9))}`);
  console.log(`score best   ${formatSeconds(scores.at(-1) ?? 0)}`);
  console.log(`score worst  ${formatSeconds(scores[0] ?? 0)}`);
  console.log(`capped       ${cappedCount}/${results.length}`);
  console.log(`dash deaths  ${dashDeathCount}/${results.length}`);
  console.log("");
  console.log(
    `avg pickups  ${average(results.map((result) => result.pickups)).toFixed(2)}`,
  );
  console.log(
    `avg dashes   ${average(results.map((result) => result.dashes)).toFixed(2)}`,
  );
  console.log(
    `avg presagio ${average(results.map((result) => result.presagios)).toFixed(2)}`,
  );
  console.log(
    `avg letargo  ${formatSeconds(average(results.map((result) => result.letargoSeconds)))}`,
  );
  console.log("");
  console.log("top runs");

  for (const result of [...results]
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(5, results.length))) {
    console.log(
      `#${String(result.index).padStart(2, "0")} seed=${result.seed} ` +
        `score=${formatSeconds(result.score)} pickups=${result.pickups} ` +
        `dash=${result.dashes} presagio=${result.presagios} ` +
        `bullets=${result.bulletsAtEnd}${result.capped ? " capped" : ""}`,
    );
  }
}

function parseOptions(args: string[]): BenchmarkOptions {
  return {
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
    // ponytail: deterministic LCG is enough for repeatable benchmark runs.
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
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
