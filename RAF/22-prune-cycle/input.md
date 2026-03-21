- [ ] clean worktrees on execution completion. in case of plan --amend - look for a git branch what matches project name (raf creates it during plan) and create new git worktree from it and then continue amend flow from there

---

if branch not exist - copy use the same flow as "raf do"