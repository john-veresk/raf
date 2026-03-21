- [ ] fix minor bugs
- [ ] update cli help docs to reflect on removed --worktreee --no-worktree flags
- [ ] Pass the provider option through to generateProjectNames() so it spawns the correct binary (codex or claude) instead of hardcoding claude. Update callSonnetForMultipleNames and runClaudePrint to  accept a provider parameter and use getProviderBinaryName(provider) for the spawn call.

---

update default config so all codedx modals are gpt-5.4
separate mapping for effort to model resoning effort in config from
  the task effort level (low/medium/high) or as a separate config field for codex only