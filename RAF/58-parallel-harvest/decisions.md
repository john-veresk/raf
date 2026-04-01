# Project Decisions

## When multiple projects are selected, should they run sequentially or in parallel?
Sequential. Run projects one after another — simpler, no resource contention, easier to follow output.

## Should the picker default to multi-select, or require a flag?
Always multi-select. The picker always allows selecting multiple projects. Selecting one still works fine.

## Should `raf do` also accept multiple project names as CLI arguments?
Yes. Allow passing multiple project identifiers as positional args (e.g. `raf do project1 project2`), bypassing the picker.

## Should the AI merge resolution run interactively or non-interactively?
Non-interactive. Fully automated — RAF invokes claude -p with merge instructions, no user intervention. Consistent with how task execution works.

## If the AI also fails to resolve merge conflicts, what should happen?
Abort merge (git merge --abort) to restore clean state, then warn user to merge manually.

## What commit message format should the AI-resolved merge use?
RAF prefix format, e.g. `RAF[project-name] Merge: branch-name into main` — consistent with other RAF commits.

## Should the worktree removal order change for AI merge?
Yes. New flow: attempt merge in main repo first, if conflicts arise invoke AI to resolve, then remove worktree after successful merge. (Previously worktree was removed before merge attempt.)

## Should the amend-worktree fix apply to `raf plan --amend` only, or also to `raf do`?
Only `raf plan --amend`. `raf do` already handles worktree projects correctly once they exist.

## When creating a worktree for an existing main-repo project, should project files be explicitly copied?
No. Git handles it — the project files are already tracked in git, so creating a worktree from the current branch automatically includes them. No explicit copy needed.

## Should the worktree branch reuse an existing branch or always create a fresh one?
Reuse if exists. Check if a branch matching the project folder name already exists (e.g. from a previous run). If so, create a worktree from that branch via `createWorktreeFromBranch`. Otherwise create a new one via `createWorktree`.

## After a successful merge, should the local branch be deleted automatically or should the user be prompted?
Auto-delete. Silently delete the local branch after successful merge — no prompt needed. The branch is already merged, so it's safe.

## Should the cleanup also delete the remote branch if it was pushed?
Local only. Only delete the local branch. Remote cleanup is out of scope — PRs handle their own branch deletion.

## Should `git worktree prune` be run after worktree removal?
Yes, always prune. Run `git worktree prune` after removing a worktree to keep `.git/worktrees/` clean.

## Should branch cleanup happen for all post-execution actions or only after merge?
Merge only. Only delete the branch after a successful merge. PR and leave-as-is need the branch to remain.
