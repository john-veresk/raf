import { resolvePostRateLimitWaitDecision } from '../../src/commands/do.js';

describe('do rate-limit graceful stop decision', () => {
  it('retries when wait completes and cancel is not armed', () => {
    expect(resolvePostRateLimitWaitDecision(true, false)).toEqual({ action: 'retry' });
  });

  it('stops gracefully when wait completes and cancel is still armed', () => {
    expect(resolvePostRateLimitWaitDecision(true, true)).toEqual({ action: 'graceful-stop' });
  });

  it('returns abort failure when wait is interrupted', () => {
    expect(resolvePostRateLimitWaitDecision(false, false)).toEqual({
      action: 'abort',
      failureReason: 'Rate limit wait aborted',
    });
  });
});
