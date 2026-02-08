add support for git worktree if you pass --worktree flag to "do" or "plan". plan should be created
with --worktree for raf do to work in worktree mode. --worktree means worktree folder will be
created with git. use path "../<current folder name>-worktrees/<current folder name>-<project id
like 001>". based on thether worktree dir exists in git we can validate if "raf do" can work in
worktree mode. in worktree mode raf switches to worktree dir (in created branch with project name) and plans, commits and do work there.
on project completion if it's possible to merge <project name> branch into original branch from with
raf was called - it does so


