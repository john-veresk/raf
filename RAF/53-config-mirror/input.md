- [ ] for config presets make so when i loaded config - it "linked", meaning editing default config edits loaded preset, do it by linking or copy, investigate and suggest
split into two tasks

---

➜  RAF git:(main) raf config preset load claude
Loaded preset "claude" into /Users/eremeev/.raf/raf.config.json
  Keys: models, effortMapping, worktree, timeout, maxRetries, pushOnComplete
➜  RAF git:(main) ls ~/.raf/
presets         raf.config.json worktrees

why raf.config.json is not linked? save and load should create symlinks