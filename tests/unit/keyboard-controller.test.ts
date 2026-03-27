import { jest } from '@jest/globals';

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

const { KeyboardController } = await import('../../src/utils/keyboard-controller.js');

describe('KeyboardController', () => {
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
    const ctrl = new KeyboardController(true);
    expect(ctrl.isVerbose).toBe(true);

    const ctrl2 = new KeyboardController(false);
    expect(ctrl2.isVerbose).toBe(false);
  });

  it('initializes with paused=false and cancelled=false', () => {
    const ctrl = new KeyboardController(false);
    expect(ctrl.isPaused).toBe(false);
    expect(ctrl.isCancelled).toBe(false);
  });

  it('is not active before start()', () => {
    const ctrl = new KeyboardController(false);
    expect(ctrl.isActive).toBe(false);
  });

  it('becomes active after start() on a TTY', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    expect(ctrl.isActive).toBe(true);
    expect(mockSetRawMode).toHaveBeenCalledWith(true);
    ctrl.stop();
  });

  it('shows hotkeys hint on start', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    expect(mockDim).toHaveBeenCalledWith('  Hotkeys: Tab = verbose, P = pause, C = cancel');
    ctrl.stop();
  });

  it('skips start when stdin is not a TTY', () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, writable: true, configurable: true });
    const ctrl = new KeyboardController(false);
    ctrl.start();
    expect(ctrl.isActive).toBe(false);
    expect(mockSetRawMode).not.toHaveBeenCalled();
  });

  it('toggles verbose state on Tab keypress', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();

    // Simulate Tab key (0x09)
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(ctrl.isVerbose).toBe(true);
    expect(mockDim).toHaveBeenCalledWith('  [verbose: on]');

    // Toggle back
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(ctrl.isVerbose).toBe(false);
    expect(mockDim).toHaveBeenCalledWith('  [verbose: off]');

    ctrl.stop();
  });

  it('emits SIGINT on Ctrl+C keypress', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();

    const sigintHandler = jest.fn();
    process.once('SIGINT', sigintHandler);

    // Simulate Ctrl+C (0x03)
    process.stdin.emit('data', Buffer.from([0x03]));
    expect(sigintHandler).toHaveBeenCalled();

    ctrl.stop();
  });

  it('toggles pause on p keypress', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    mockDim.mockClear();

    // Press 'p' to pause
    process.stdin.emit('data', Buffer.from([0x70]));
    expect(ctrl.isPaused).toBe(true);
    expect(mockDim).toHaveBeenCalledWith('  [paused]');

    // Press 'p' to resume
    process.stdin.emit('data', Buffer.from([0x70]));
    expect(ctrl.isPaused).toBe(false);
    expect(mockDim).toHaveBeenCalledWith('  [resumed]');

    ctrl.stop();
  });

  it('toggles pause on P (uppercase) keypress', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    mockDim.mockClear();

    process.stdin.emit('data', Buffer.from([0x50]));
    expect(ctrl.isPaused).toBe(true);
    expect(mockDim).toHaveBeenCalledWith('  [paused]');

    ctrl.stop();
  });

  it('sets cancelled on c keypress (one-way)', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    mockDim.mockClear();

    process.stdin.emit('data', Buffer.from([0x63]));
    expect(ctrl.isCancelled).toBe(true);
    expect(mockDim).toHaveBeenCalledWith('  [stopping after current task...]');

    // Pressing 'c' again should not log again
    mockDim.mockClear();
    process.stdin.emit('data', Buffer.from([0x63]));
    expect(ctrl.isCancelled).toBe(true);
    expect(mockDim).not.toHaveBeenCalled();

    ctrl.stop();
  });

  it('sets cancelled on C (uppercase) keypress', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    mockDim.mockClear();

    process.stdin.emit('data', Buffer.from([0x43]));
    expect(ctrl.isCancelled).toBe(true);
    expect(mockDim).toHaveBeenCalledWith('  [stopping after current task...]');

    ctrl.stop();
  });

  it('waitForResume() resolves immediately when not paused', async () => {
    const ctrl = new KeyboardController(false);
    await ctrl.waitForResume(); // should not hang
  });

  it('waitForResume() waits until unpaused', async () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();

    // Pause
    process.stdin.emit('data', Buffer.from([0x70]));
    expect(ctrl.isPaused).toBe(true);

    let resolved = false;
    const promise = ctrl.waitForResume().then(() => { resolved = true; });

    // Not yet resolved
    await Promise.resolve(); // flush microtasks
    expect(resolved).toBe(false);

    // Unpause
    process.stdin.emit('data', Buffer.from([0x70]));
    await promise;
    expect(resolved).toBe(true);

    ctrl.stop();
  });

  it('waitForResume() resolves when stop() is called while paused', async () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();

    // Pause
    process.stdin.emit('data', Buffer.from([0x70]));

    let resolved = false;
    const promise = ctrl.waitForResume().then(() => { resolved = true; });

    await Promise.resolve();
    expect(resolved).toBe(false);

    // Stop should flush resolvers
    ctrl.stop();
    await promise;
    expect(resolved).toBe(true);
  });

  it('handles multiple bytes in a single data event', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();

    // Two Tab keys in one buffer
    process.stdin.emit('data', Buffer.from([0x09, 0x09]));
    // Should toggle twice -> back to false
    expect(ctrl.isVerbose).toBe(false);

    ctrl.stop();
  });

  it('restores stdin on stop()', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    ctrl.stop();

    expect(ctrl.isActive).toBe(false);
    expect(mockSetRawMode).toHaveBeenCalledWith(false);
    expect(process.stdin.pause).toHaveBeenCalled();
  });

  it('is safe to call stop() multiple times', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    ctrl.stop();
    ctrl.stop(); // should not throw
    expect(ctrl.isActive).toBe(false);
  });

  it('is safe to call start() multiple times', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    ctrl.start(); // should not start again
    expect(mockSetRawMode).toHaveBeenCalledTimes(1);
    ctrl.stop();
  });

  it('does not respond to keypress after stop()', () => {
    const ctrl = new KeyboardController(false);
    ctrl.start();
    ctrl.stop();

    // Clear mocks to check no new calls
    mockDim.mockClear();

    // This should not trigger any toggle
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(ctrl.isVerbose).toBe(false);
    expect(mockDim).not.toHaveBeenCalled();
  });

  it('works correctly across multiple tasks (stop and restart)', () => {
    const ctrl = new KeyboardController(false);

    // First task
    ctrl.start();
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(ctrl.isVerbose).toBe(true);
    ctrl.stop();

    // State persists after stop
    expect(ctrl.isVerbose).toBe(true);

    // Restart for second task
    ctrl.start();
    expect(ctrl.isVerbose).toBe(true); // Still true from previous toggle
    process.stdin.emit('data', Buffer.from([0x09]));
    expect(ctrl.isVerbose).toBe(false);
    ctrl.stop();
  });

  it('handles setRawMode throwing an error', () => {
    mockSetRawMode.mockImplementation(() => { throw new Error('Cannot set raw mode'); });
    const ctrl = new KeyboardController(false);
    ctrl.start();
    // Should gracefully skip activation
    expect(ctrl.isActive).toBe(false);
  });
});
