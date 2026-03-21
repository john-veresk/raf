---
effort: medium
---
# Task: Restructure Config Command Into Subcommands

## Objective
Replace the flag-driven `raf config` API with explicit subcommands for reading, writing, resetting, and interactive editing.

## Context
`src/commands/config.ts` currently mixes interactive editing with `--get`, `--set`, and `--reset` flags on the root `config` command. The new API should be command-oriented instead: `raf config get`, `raf config set`, `raf config reset`, and `raf config wizard`. This is an intentional breaking change, so backward compatibility is not required.

## Requirements
- Remove the root `--get`, `--set`, and `--reset` options from `raf config`.
- Add `raf config get [key]` for resolved-config reads, preserving current dot-notation lookup behavior.
- Add `raf config set <key> <value>` for writes, preserving current parsing, validation, and minimal-config-file behavior.
- Add `raf config reset` for deleting the config file with the current confirmation flow.
- Add `raf config wizard [prompt...]` as the only entry point for the interactive config editor.
- Do not launch the interactive editor from bare `raf config`; treat the root command as a namespace/help entry point.
- Preserve the current invalid-config recovery behavior for the interactive session, but update any user-facing messages that reference the old flag-based API.

## Implementation Steps
1. Refactor `src/commands/config.ts` so the root `config` command registers subcommands instead of root-level flags.
2. Reuse the existing get/set/reset/session helper logic where possible rather than reimplementing behavior.
3. Move the variadic prompt argument from the root command to the new `wizard` subcommand.
4. Update command descriptions so `raf config --help` and `raf config <subcommand> --help` reflect the new API cleanly.
5. Adjust user-facing error and warning strings in config flows that currently mention `raf config`, `--reset`, or the old flag forms.

## Acceptance Criteria
- [ ] `raf config get` prints the resolved config, and `raf config get <dot.path>` prints the requested value.
- [ ] `raf config set <dot.path> <value>` updates the user config with the same validation and default-pruning behavior as before.
- [ ] `raf config reset` deletes the config file only after confirmation.
- [ ] `raf config wizard [prompt...]` launches the interactive editor and preserves broken-config recovery behavior.
- [ ] Bare `raf config` no longer launches the interactive editor.
- [ ] All tests pass.

## Notes
The user explicitly wants `wizard` to replace the old bare interactive entry. Showing help from bare `raf config` is the sensible default if no subcommand is provided.
