const bestTimeKey = "bullent.bestTime";

export function loadBestTime(): number {
  try {
    const value = Number(localStorage.getItem(bestTimeKey) ?? 0);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveBestTime(currentBest: number, value: number): number {
  const nextBest = Math.max(currentBest, value);

  try {
    localStorage.setItem(bestTimeKey, String(nextBest));
  } catch {
    // Local storage is optional; the in-memory record still works for this session.
  }

  return nextBest;
}
