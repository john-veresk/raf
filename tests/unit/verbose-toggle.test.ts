import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock logger to capture output
const mockDim = jest.fn();
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  logger: {
    dim: mockDim,
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const { VerboseToggle } = await import('../../src/utils/verbose-toggle.js');

describe('VerboseToggle', () => {
  // Save original stdin properties
  const originalIsTTY = process.stdin.isTTY;
  const originalSetRawMode = process.stdin.setRawMode;
  const originalResume = process.stdin.resume;
  const originalPause = process.stdin.pause;

  let mockSetRawMode: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetRawMode = jest.fn();
    Object.defineProperty(process.stdin, 'isTTY', { value: true, writable: true, configurable: true });
    (process.stdin as any).setRawMode = mockSetRawMode;
    (process.stdin as any).resume = jest.fn();
    (process.stdin as any).pause = jest.fn();
  });

  afterEach(() => {
    // Restore original stdin
    Object.defineProperty(process.stdin, 'isTTY', { value: originalIsTTY, writable: true, configurable: true });
    if (originalSetRawMode) {
      (process.stdin as any).setRawMode = originalSetRawMode;
    }
    (process.stdin as any).resume = originalResume;
    (process.stdin as any).pause = originalPause;
  });

  it('initializes with the provided verbose state', () => {
    const toggle = new VerboseToggle(true);
    expect(toggle.isVerbose).toBe(true);

    const toggle2 = new VerboseToggle(false);
    expect(toggle2.isVerbose).toBe(false);
  });

  it('is not active before start()', () => {
    const toggle = new VerboseToggle(false);
    expect(toggle.isActive).toBe(false);
  });

  it('becomes active after start() on a TTY', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();
    expect(toggle.isActive).toBe(true);
    expect(mockSetRawMode).toHaveBeenCalledWith(true);
    toggle.stop();
  });

  it('shows toggle hint on start', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();
    expect(mockDim).toHaveBeenCalledWith('  Press Tab to toggle verbose mode');
    toggle.stop();
  });

  it('skips start when stdin is not a TTY', () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true, configurable: true });
    const toggle = new VerboseToggle(false);
    toggle.start();
    expect(toggle.isActive).toBe(false);
    expect(mockSetRawMode).not.toHaveBeenCalled();
  });

  it('toggles verbose state on Tab keypress', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();

    // Simulate Tab key (0x09)
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(toggle.isVerbose).toBe(true);
    expect(mockDim).toHaveBeenCalledWith('  [verbose: on]');

    // Toggle back
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(toggle.isVerbose).toBe(false);
    expect(mockDim).toHaveBeenCalledWith('  [verbose: off]');

    toggle.stop();
  });

  it('emits SIGINT on Ctrl+C keypress', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();

    const sigintHandler = jest.fn();
    process.once('SIGINT', sigintHandler);

    // Simulate Ctrl+C (0x03)
    process.stdin.emit('data', Buffer.from([0x03]));
    expect(sigintHandler).toHaveBeenCalled();

    toggle.stop();
  });

  it('ignores non-Tab, non-Ctrl+C keypresses', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();

    // Simulate 'a' keypress
    process.stdin.emit('data', Buffer.from([0x61]));
    expect(toggle.isVerbose).toBe(false);

    toggle.stop();
  });

  it('handles multiple bytes in a single data event', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();

    // Two Tab keys in one buffer
    process.stdin.emit('data', Buffer.from([0x09, 0x09]));
    // Should toggle twice → back to false
    expect(toggle.isVerbose).toBe(false);

    toggle.stop();
  });

  it('restores stdin on stop()', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();
    toggle.stop();

    expect(toggle.isActive).toBe(false);
    expect(mockSetRawMode).toHaveBeenCalledWith(false);
    expect(process.stdin.pause).toHaveBeenCalled();
  });

  it('is safe to call stop() multiple times', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();
    toggle.stop();
    toggle.stop(); // should not throw
    expect(toggle.isActive).toBe(false);
  });

  it('is safe to call start() multiple times', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();
    toggle.start(); // should not start again
    expect(mockSetRawMode).toHaveBeenCalledTimes(1);
    toggle.stop();
  });

  it('does not respond to keypress after stop()', () => {
    const toggle = new VerboseToggle(false);
    toggle.start();
    toggle.stop();

    // Clear mocks to check no new calls
    mockDim.mockClear();

    // This should not trigger any toggle
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(toggle.isVerbose).toBe(false);
    // Only the hint message was logged (already cleared by mockClear), no toggle messages
    expect(mockDim).not.toHaveBeenCalled();
  });

  it('works correctly across multiple tasks (stop and restart)', () => {
    const toggle = new VerboseToggle(false);

    // First task
    toggle.start();
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(toggle.isVerbose).toBe(true);
    toggle.stop();

    // State persists after stop
    expect(toggle.isVerbose).toBe(true);

    // Restart for second task
    toggle.start();
    expect(toggle.isVerbose).toBe(true); // Still true from previous toggle
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(toggle.isVerbose).toBe(false);
    toggle.stop();
  });

  it('handles setRawMode throwing an error', () => {
    mockSetRawMode.mockImplementation(() => { throw new Error('Cannot set raw mode'); });
    const toggle = new VerboseToggle(false);
    toggle.start();
    // Should gracefully skip activation
    expect(toggle.isActive).toBe(false);
  });
});
