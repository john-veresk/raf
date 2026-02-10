# Project Decisions

## For the per-task token summary, should it show accumulated total or per-attempt breakdown?
Per-attempt breakdown — show token usage for each attempt individually, plus a combined total.

## Should per-attempt breakdown appear in normal output or only with --verbose?
Always show breakdown — per-attempt details shown regardless of verbose flag for full cost transparency.

## Should TokenTracker store per-attempt data, or should accumulation happen in do.ts?
Tracker stores attempts — TokenTracker gains a richer data model with per-attempt entries. addTask accepts an array of UsageData. Centralized logic.

## Should the grand total summary also show per-attempt breakdown?
Grand total only — the final summary shows combined totals. Per-attempt detail is available in individual task summaries above.

## What format for the model name in log messages?
"...with sonnet" style — append 'with <model>' before the ellipsis, e.g., "Generating project name suggestions with sonnet..."

## Should the model name be the short alias or full model ID?
Short alias — display friendly names like 'sonnet', 'haiku', 'opus'. Cleaner output.

## Should model-in-log apply only to name generation or all Claude calls?
All Claude calls — add model names to all log messages where RAF invokes Claude (name generation, failure analysis, PR generation, config session).

## When config is invalid, should `raf config` silently fall back or warn?
Warn then continue — show a warning about the invalid config, then launch the interactive session normally with defaults.

## Should config resilience apply to all commands or only `raf config`?
Only `raf config` — it's the recovery tool. Other commands can still fail fast on invalid config.
