# Project Decisions

## When the daily quota limit is hit, should RAF pause the entire execution (all remaining tasks) and resume after reset, or should it abort and let you manually restart?
Pause & auto-resume — RAF sleeps until the reset time, then automatically continues with the current/next task.

## Where exactly does the rate limit message appear — is it in Claude Code's stdout/stderr stream, or does the process exit with a specific code?
Not sure — need to investigate. Will research the exact mechanism.

## Should we research how Claude Code CLI and OpenAI Codex CLI handle rate limits internally?
Yes, research both Claude Code and Codex source code for rate limit handling patterns.

## Should RAF handle Codex rate limits, or just Claude Code?
Both Claude & Codex — handle rate limits for both harnesses since RAF supports both runners.

## Should RAF show a countdown/status while waiting for the rate limit to reset?
Countdown timer — show a live countdown like "Rate limit hit. Resuming in 2h 14m 30s (resets 10:00 Europe/Helsinki)".

## What should happen if the reset time can't be parsed from the output?
Wait a fixed duration — fall back to a configurable default wait time (e.g. 1 hour) if reset time is unknown.
