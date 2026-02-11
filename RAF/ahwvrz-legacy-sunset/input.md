- [ ] remove `raf migrate-project-ids-base26` (all code and update readme)

---

investigate why this doesn't work
➜  RAF git:(main) raf plan --resume ahwvrz-legacy-sunset --worktree
✗ Project not found: ahwvrz-legacy-sunset

is the promlem with worktree resolution? fix and make sure --worktree is optional and check either
way