import { jest } from '@jest/globals';
import { formatElapsedTime, createTaskTimer } from '../../src/utils/timer.js';

describe('Timer', () => {
  describe('formatElapsedTime', () => {
    it('should format seconds only for less than a minute', () => {
      expect(formatElapsedTime(0)).toBe('0s');
      expect(formatElapsedTime(1000)).toBe('1s');
      expect(formatElapsedTime(30000)).toBe('30s');
      expect(formatElapsedTime(59000)).toBe('59s');
    });

    it('should format minutes and seconds for less than an hour', () => {
      expect(formatElapsedTime(60000)).toBe('1m 0s');
      expect(formatElapsedTime(90000)).toBe('1m 30s');
      expect(formatElapsedTime(150000)).toBe('2m 30s');
      expect(formatElapsedTime(3599000)).toBe('59m 59s');
    });

    it('should format hours and minutes for an hour or more', () => {
      expect(formatElapsedTime(3600000)).toBe('1h 0m');
      expect(formatElapsedTime(3660000)).toBe('1h 1m');
      expect(formatElapsedTime(7200000)).toBe('2h 0m');
      expect(formatElapsedTime(7290000)).toBe('2h 1m');
      expect(formatElapsedTime(86400000)).toBe('24h 0m');
    });

    it('should round down to whole seconds', () => {
      expect(formatElapsedTime(1500)).toBe('1s');
      expect(formatElapsedTime(1999)).toBe('1s');
    });
  });

  describe('createTaskTimer', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track elapsed time', () => {
      const timer = createTaskTimer();
      timer.start();

      jest.advanceTimersByTime(5000);
      expect(timer.getElapsed()).toBeGreaterThanOrEqual(5000);

      const elapsed = timer.stop();
      expect(elapsed).toBeGreaterThanOrEqual(5000);
    });

    it('should return 0 when stopped before starting', () => {
      const timer = createTaskTimer();
      expect(timer.stop()).toBe(0);
    });

    it('should return 0 for getElapsed when not started', () => {
      const timer = createTaskTimer();
      expect(timer.getElapsed()).toBe(0);
    });

    it('should call onTick callback immediately and every second', () => {
      const onTick = jest.fn();
      const timer = createTaskTimer(onTick);

      timer.start();
      expect(onTick).toHaveBeenCalledWith(0);

      jest.advanceTimersByTime(1000);
      expect(onTick).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(2000);
      expect(onTick).toHaveBeenCalledTimes(4);

      timer.stop();
    });

    it('should stop calling onTick after stop()', () => {
      const onTick = jest.fn();
      const timer = createTaskTimer(onTick);

      timer.start();
      jest.advanceTimersByTime(2000);
      const callCount = onTick.mock.calls.length;

      timer.stop();
      jest.advanceTimersByTime(5000);

      expect(onTick.mock.calls.length).toBe(callCount);
    });

    it('should not call onTick when not provided', () => {
      const timer = createTaskTimer();
      timer.start();
      jest.advanceTimersByTime(5000);
      timer.stop();
      // No assertion needed - just checking it doesn't throw
    });
  });
});
