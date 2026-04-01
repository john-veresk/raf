# Project Decisions

## When 'PR' is selected and PR preflight fails for one of the worktree projects, should all projects fall back to 'leave', or should only the failing project fall back while others still get PRs?
Per-project fallback — only the project whose preflight fails falls back to 'leave'; others still get PRs created.

## Should the prompt only appear when at least one selected project is worktree-based, or should it always appear for multi-project runs?
Only if worktree projects are selected. Skip the prompt entirely if no worktree projects are in the selection.

## What should the generic prompt message say?
List the branch names: "After tasks complete, what should happen with branches \"58-parallel-harvest\", \"59-config-refactor\"?" — with choice labels also pluralized ("Leave branches as-is").

## When only a single worktree project is selected, should the prompt stay as-is (singular) or use the new format?
Keep singular for one project — preserve current behavior. Only use the new plural format when multiple worktree projects are selected.
