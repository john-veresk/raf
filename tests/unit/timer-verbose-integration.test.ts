import { jest } from '@jest/globals';
import { createStatusLine } from '../../src/utils/status-line.js';
import { createTaskTimer } from '../../src/utils/timer.js';

/**
 * Tests the interaction between the timer callback, status line, and verbose toggle.
 * This mirrors the logic in do.ts where the onTick callback checks verboseToggle.isVerbose
 * and clears/skips the status line when verbose is on.
 */
describe('Timer-Verbose Integration', () => {
  let originalIsTTY: boolean | undefined;
  let originalWrite: typeof process.stdout.write;
  let writeOutput: string[];

  beforeEach(() => {
    jest.useFakeTimers();
    originalIsTTY = process.stdout.isTTY;
    originalWrite = process.stdout.write;
    writeOutput = [];

    // Mock stdout.write to capture output
    process.stdout.isTTY = true;
    process.stdout.write = jest.fn((data: string | Uint8Array) => {
      writeOutput.push(data.toString());
      return true;
    }) as typeof process.stdout.write;
  });

  afterEach(() => {
    jest.useRealTimers();
    process.stdout.isTTY = originalIsTTY;
    process.stdout.write = originalWrite;
  });

  describe('onTick callback with verbose check', () => {
    it('should update status line when verbose is off', () => {
      const statusLine = createStatusLine();
      let isVerbose = false;

      const timer = createTaskTimer((elapsed) => {
        if (isVerbose) {
          statusLine.clear();
          return;
        }
        statusLine.update(`Task running: ${elapsed}ms`);
      });

      timer.start();
      expect(writeOutput.length).toBeGreaterThan(0);
      expect(writeOutput.some(output => output.includes('Task running'))).toBe(true);

      timer.stop();
    });

    it('should clear status line and skip update when verbose is toggled on', () => {
      const statusLine = createStatusLine();
      let isVerbose = false;

      const timer = createTaskTimer((elapsed) => {
        if (isVerbose) {
          statusLine.clear();
          return;
        }
        statusLine.update(`Task running: ${elapsed}ms`);
      });

      timer.start();
      // Initial tick should update
      expect(writeOutput.some(output => output.includes('Task running: 0ms'))).toBe(true);

      // Toggle verbose on
      isVerbose = true;
      writeOutput = [];

      // Next tick should clear the line instead of updating
      jest.advanceTimersByTime(1000);

      // Should have cleared (written empty/reset) but not updated with task info
      expect(writeOutput.length).toBeGreaterThan(0);
      // The clear writes spaces to overwrite, not "Task running"
      expect(writeOutput.some(output => output.includes('Task running'))).toBe(false);

      timer.stop();
    });

    it('should resume updating status line when verbose is toggled back off', () => {
      const statusLine = createStatusLine();
      let isVerbose = false;

      const timer = createTaskTimer((elapsed) => {
        if (isVerbose) {
          statusLine.clear();
          return;
        }
        statusLine.update(`Task running: ${elapsed}ms`);
      });

      timer.start();
      // Toggle verbose on
      isVerbose = true;
      jest.advanceTimersByTime(1000);

      // Toggle verbose back off
      isVerbose = false;
      writeOutput = [];

      // Next tick should update normally
      jest.advanceTimersByTime(1000);

      expect(writeOutput.some(output => output.includes('Task running'))).toBe(true);

      timer.stop();
    });

    it('should track elapsed time correctly regardless of verbose state', () => {
      const statusLine = createStatusLine();
      let isVerbose = false;

      const timer = createTaskTimer((elapsed) => {
        if (isVerbose) {
          statusLine.clear();
          return;
        }
        statusLine.update(`Task running: ${elapsed}ms`);
      });

      timer.start();

      // Run some time with verbose off
      jest.advanceTimersByTime(2000);
      expect(timer.getElapsed()).toBeGreaterThanOrEqual(2000);

      // Toggle verbose on - timer keeps running
      isVerbose = true;
      jest.advanceTimersByTime(3000);
      expect(timer.getElapsed()).toBeGreaterThanOrEqual(5000);

      // Toggle verbose off - elapsed time is accurate
      isVerbose = false;
      writeOutput = [];
      jest.advanceTimersByTime(1000);

      // The elapsed time should be around 6000ms now, visible in the output
      expect(writeOutput.some(output => output.includes('Task running'))).toBe(true);
      expect(timer.getElapsed()).toBeGreaterThanOrEqual(6000);

      timer.stop();
    });

    it('should not create timer callback when started with verbose flag', () => {
      // This mirrors the do.ts logic: verbose ? undefined : (elapsed) => {...}
      const initialVerbose = true;
      const onTick = initialVerbose ? undefined : jest.fn();

      const timer = createTaskTimer(onTick);
      timer.start();

      jest.advanceTimersByTime(5000);

      // No callback should have been called
      if (onTick) {
        expect(onTick).not.toHaveBeenCalled();
      }
      // Timer still tracks time
      expect(timer.getElapsed()).toBeGreaterThanOrEqual(5000);

      timer.stop();
    });
  });
});
