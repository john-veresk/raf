# Project Decisions

## Should `C` remain a one-way cancel, or become a true toggle during execution?
Make `C` a true toggle. If cancel was requested while the current task is still running, pressing `C` again should clear that pending cancel so later tasks continue.

## Should the runtime messaging acknowledge that cancel can be toggled off?
Yes. Update the hotkey hint to describe toggle behavior and log a visible message when a second `C` clears the pending cancel.

## Should the cancel toggle also apply while RAF is waiting for a rate limit reset between attempts?
Yes. Use the same toggle semantics during rate-limit waits so RAF can stop before the retry starts, and a second `C` can clear that pending stop before the wait finishes.
