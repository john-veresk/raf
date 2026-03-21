# RAF

Node.js CLI tool that orchestrates task planning and execution via Claude Code CLI.

- New features should be configurable — add keys to `DEFAULT_CONFIG` in `src/types/config.ts`

## When Changing Code

- Keep README.md updated when adding/changing CLI commands, flags, or features
- This app has no users. Make whatever changes you want. This project is super greenfield. It's ok if you change the schema entirely.
- The role of this file is to describe common mistakes and confusion points that agents might encounter as they work in this project. If you ever encounter something in the project that surprises you, please alert the developer working with you and indicate that this is the case in the AgentMD file to help prevent future agents from having the same issue.

## Agent Notes

- Some older tests may drift behind current CLI behavior, especially around removed `--worktree` command examples in planning prompts. Verify prompt expectations against the live command UX before trusting test names.
- Tests that exercise default model/provider selection should avoid hardcoding Claude-specific assumptions; local config can route defaults through Codex unless the test explicitly mocks config resolution.
