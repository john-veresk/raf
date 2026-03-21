# Project Decisions

## Should existing projects with base26 IDs be migrated to numeric IDs?
No migration needed. No need to support old base26 project IDs — consider it a fresh start.

## Should numeric project IDs be zero-padded (e.g., 001-foo) or unpadded (1-foo)?
No padding. Use simple unpadded numbers: 1-foo, 2-bar, 10-buz, 101-bar.

## When amend produces no new plans but updates decisions/input/plans, what commit message format?
Use the existing 'Amend' format: `RAF[id] Amend: project-name`.

## For auto-detecting existing projects on `raf plan project-name`, should it use exact or fuzzy matching?
Exact match only. Only prompt if a project with the exact same name exists.

## Should task IDs follow the same numeric approach as project IDs?
Yes, same approach — no padding, no migration, fresh start.

## When creating a new project, should we scan all worktrees + main for the highest ID?
Yes, scan all. Scan main repo RAF/ folder + all worktree RAF/ folders to find the highest numeric ID, then increment.

## Should gaps in the ID sequence be filled or left as-is?
Gaps are fine. If projects 1, 2, 3, 5 exist, next project is 6 (not 4). Always use max + 1.
