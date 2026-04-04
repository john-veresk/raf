# Project Decisions

## For removing the council feature: should I also remove the councilMode key from DEFAULT_CONFIG and the config validation schema entirely, or leave it as a deprecated no-op for backward compat?
Remove completely — delete councilMode from config type, DEFAULT_CONFIG, validation, getter, config-docs.md. Clean slate.

## Rate limit pause doesn't trigger after Mac sleep — what approach to fix?
The bug is that `remaining -= sleepMs` tracks elapsed time by decrementing the requested setTimeout duration, which freezes during Mac sleep. Fix: compute a target end time upfront (`Date.now() + rawDuration`) and check `Date.now() >= targetEndTime` each loop iteration instead of decrementing. On wake, Date.now() jumps forward and the loop exits immediately.

## For showing name picker with -y: should it show generated suggestions or only prompt for custom name?
Show full picker — same name picker UI as non-auto mode (list of generated suggestions + custom option). Only the -y (dangerous permissions) behavior continues after picking.

## For --worktree/--no-worktree flags on 'raf plan': should these also apply to amend mode?
New only — flags only affect new project creation via 'raf plan'. Amend keeps its existing worktree promotion logic based on config.
