/**
 * Format elapsed time in human-readable format.
 * - Under 1 minute: "Xs"
 * - Under 1 hour: "Xm Ys"
 * - 1 hour or more: "Xh Ym"
 */
export function formatElapsedTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

export interface TaskTimer {
  start: () => void;
  stop: () => number;
  getElapsed: () => number;
}

/**
 * Creates a task timer that tracks elapsed time and can display a status line.
 */
export function createTaskTimer(onTick?: (elapsed: number) => void): TaskTimer {
  let startTime: number | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;

  return {
    start(): void {
      startTime = Date.now();
      if (onTick) {
        // Immediately show initial state
        onTick(0);
        // Then update every second
        intervalId = setInterval(() => {
          if (startTime !== null) {
            onTick(Date.now() - startTime);
          }
        }, 1000);
      }
    },

    stop(): number {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      const elapsed = startTime !== null ? Date.now() - startTime : 0;
      startTime = null;
      return elapsed;
    },

    getElapsed(): number {
      return startTime !== null ? Date.now() - startTime : 0;
    },
  };
}
