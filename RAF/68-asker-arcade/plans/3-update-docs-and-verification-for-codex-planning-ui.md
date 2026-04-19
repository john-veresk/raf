---
effort: medium
---
# Task: Update Docs and Verification for Codex Planning UI

## Objective
Align user-facing documentation and regression coverage with the new harness-aware planning behavior.

## Requirements
- Remove Claude-only wording from planning docs and logs where the active harness may be Codex.
- Document the split explicitly: Claude planning uses `AskUserQuestion`; Codex planning uses Codex planning UI backed by `request_user_input`.
- Keep the existing Codex resume limitation clear.
- Add tests for any command-output or branching logic introduced by the new planning-mode path.
- Record the exact Codex CLI behavior that was verified during implementation so future maintainers know what assumption the integration depends on.

## Acceptance Criteria
- [ ] `README.md` no longer states that `raf plan` always interviews via Claude.
- [ ] README documents Codex planning behavior and the remaining resume limitation in exact terms.
- [ ] User-facing planning logs stay harness-neutral unless they intentionally mention a harness-specific limitation.
- [ ] Tests cover the new UX-sensitive branching where practical.
- [ ] The implementation leaves behind a concrete note or code comment describing the verified Codex Plan-mode mechanism and tested CLI version.

## Context
Right now README says "Claude will interview you" even though the planning harness is configurable. Once Codex gets a reliable planning-mode path, that wording becomes misleading.

## Dependencies
- 1
- 2

## Files to Modify
- `README.md`
- `src/commands/plan.ts`
- relevant unit tests under `tests/unit/`

## Risks & Mitigations
- Risk: docs drift away from the actual runner behavior.
- Mitigation: tie README updates to the same task that adds verification and leave the validated Codex-version note near the implementation.
