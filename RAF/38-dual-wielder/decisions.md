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
