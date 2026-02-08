# Project Decisions

## Should we remove raf status or modify it?
Don't remove status. Add automatic worktree discovery — no flag needed.

## Should raf status need a --worktree flag?
No. Always look for worktree projects automatically (if in a git repo).

## Should raf status show only worktree projects or both main and worktree?
Both combined. If a project exists in both main repo and worktree, don't duplicate in list mode — only show additional worktree projects and mark them.

## How should worktree-only projects be marked in the status list?
Indented under a "Worktrees:" header at the bottom of the list.

## How should single-project view work when project exists in both main and worktree?
Show both states separately ONLY if they differ. For example, after an amend, the main repo might show 5/5 tasks done while the worktree shows 5/7 (not fully completed). List both with clear labels (Main: / Worktree:). If states are identical, show just the normal view with no worktree label.

## Should worktree projects always appear in status output?
Only if they differ from their main repo counterpart (more tasks, different statuses). If identical, skip them. Worktree-only projects (no main counterpart) are always shown.

## For raf plan --amend syntax change — keep -a alias?
Keep -a alias. However, this task was SKIPPED — Commander.js treats both orderings identically so no code change needed.

## For removing multi-project support from raf do — what should the arg look like?
Single project argument only: `raf do <project>` with exactly one identifier.

## For amend commit — should plan files be included?
Yes. Commit input.md, decisions.md, AND any new/modified plan files.

## Should amend commit message be distinct from new plan commit?
Yes. Use `RAF[NNN] Amend: project-name` for amendments (vs `RAF[NNN] Plan: project-name` for new plans).

## Should planning/amend exit messages be worktree-aware?
Yes. When running in worktree mode, the exit message should show `raf do <project> --worktree` instead of `raf do <project>`. Both planning and amend prompts need this.
