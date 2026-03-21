# Project Decisions

## Should the JSONL stream renderer support both old and new event formats, or replace entirely?
The "old" format is not old — it's the Claude event format. The renderer should add Codex-specific event handling (item.completed, turn.completed, etc.) alongside the existing Claude event handling. Claude should continue to work as before.

## For removing --worktree: when creating a NEW project with raf plan, should it always create a worktree or use config default?
Config default. --worktree and --no-worktree flags should STILL be supported for `raf plan` (new project creation). They determine where the new project will be created. But for --amend and auto-amend flows, the flag should be removed — auto-detect where the project lives.

## For raf plan --amend: if project exists in main but not worktree, auto-create worktree or amend in-place?
Amend in-place. Follow where the project lives — if in main repo, amend there; if in worktree, amend there.

## For raf do: just remove --worktree/--no-worktree flags, or deeper refactor?
Just remove flags. The existing auto-detection logic already scans both worktree and main. Just remove the CLI flags and let auto-detection be the only path.

## Should auto-amend detection (name collision in raf plan) scan worktrees too?
Yes, scan both main repo and worktrees for name collisions during auto-amend detection.
