# Project Decisions

## Should the default models.execute ceiling change along with effortMapping?
Keep opus ceiling. Only the effortMapping.medium default changes from sonnet to opus.

## What happens with the amend commit bug? Does it fail silently, not run at all, or commit empty?
The commit doesn't run in worktree mode specifically. After `raf plan --amend --worktree`, input.md and decisions.md are not committed.
