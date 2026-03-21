# Project Decisions

## How should we handle Codex's lack of a --system-prompt flag?
Prepend system prompt to user message. Concatenate the system prompt with the user message into a single prompt string.

## Should Codex support extend to interactive planning or only execution?
Both planning and execution. Support Codex for both `raf plan` and `raf do`.

## How should the provider be selected?
Global config + CLI override. Default provider in `raf.config.json`, overridable with `--provider` flag on commands.

## What default Codex models should map to effort levels?
- Low: `codex/gpt-5.3-codex-spark`
- Medium: `codex/gpt-5.3-codex`
- High: `codex/gpt-5.4`

Use harness prefix format: `claude/opus`, `codex/gpt-5.4`, etc.

## Should existing shorthand aliases require explicit prefixes?
No. Unprefixed aliases default to claude/ prefix. Existing configs keep working — `opus` means `claude/opus`. Only codex models need the `codex/` prefix.

## How should Codex interactive planning work?
PTY spawn like Claude. Spawn `codex` (without exec) via PTY, passing the prompt with system prompt prepended to user message.

## How should output parsing work for Codex?
Separate parsers, shared interface. Keep parsing logic completely separate for each provider but ensure they expose the same output interface (status, tokens, messages).

## How should `raf do` handle project scanning in worktree mode?
Merge both worktree and main-repo projects in the picker. When a project exists in both, worktree version takes precedence (dedup). This makes worktree mode show the same unified list as standard mode.

## What's wrong with the `raf plan` amend prompt?
The existing project check is skipped in auto mode (`-y` flag). The condition `if (projectName && !autoMode)` at plan.ts line 118 bypasses the check entirely. Fix: run the existing project check even in auto mode. When `-y` is used and an existing project is found, either auto-select amend or still prompt (breaking out of auto mode for this safety check).

## Should `raf plan --amend` and auto-detect accept numeric project IDs?
Yes. Both the explicit `--amend <id>` flow and the auto-detect prompt (`raf plan <identifier>`) should resolve numeric IDs (e.g., `raf plan --amend 38` or `raf plan 38`). Resolution should check both main-repo and worktree projects, consistent with name resolution.
