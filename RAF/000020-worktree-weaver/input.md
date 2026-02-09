add support for git worktree if you pass --worktree flag to "do" or "plan". plan should be created
with --worktree for raf do to work in worktree mode. --worktree means worktree folder will be
created with git. use path "../<current folder name>-worktrees/<current folder name>-<project id
like 001>". based on thether worktree dir exists in git we can validate if "raf do" can work in
worktree mode. in worktree mode raf switches to worktree dir (in created branch with project name) and plans, commits and do work there.
on project completion if it's possible to merge <project name> branch into original branch from with
raf was called - it does so

---

use .raf/worktrees/<repo> as a place for raf worktrees

---

make it possible to not specify project name in "raf do --worktree" command, for that raf will go to
worktrees repo and list uncompleted projects AFTER latest completed project in main tree

---

task 004 mentiones this:

When `raf do <project> --worktree` finishes with all tasks completed, the project branch should be merged back into the branch from which `raf` was originally called. This is the final step in the worktree lifecycle: plan in worktree -> execute in worktree -> merge back -> remove worktree. The parent directory (`~/.raf/worktrees/<repo>/`) is NOT cleaned up here — that is handled by `raf cleanup`.

---
let's clarify cleanup situation (and remove mentionse about clean up from project plans)
the situation is this: no cleanup, no delition of worktree, prune etc after task completion. AND no
raf cleanup command need to be implemeted. look through all the plans and update