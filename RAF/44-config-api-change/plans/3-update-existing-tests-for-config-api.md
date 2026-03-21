---
effort: low
---
# Task: Update Existing Tests For New Config API

## Objective
Align existing automated test coverage with the new subcommand-based config and preset command surface.

## Context
The current tests in `tests/unit/config-command.test.ts` assert root-level `--get`, `--set`, and `--reset` options. There does not appear to be an existing dedicated preset test suite, and the user asked to keep test work limited to updating existing coverage rather than expanding into a broad new matrix.

## Dependencies
1, 2

## Requirements
- Update existing unit tests to assert subcommand registration instead of the old root-level config flags.
- Keep test changes scoped to existing suites where practical.
- Cover the presence of `get`, `set`, `reset`, `wizard`, and nested `preset` under `config`.
- Remove or rewrite assertions that expect `raf preset` to exist as a top-level command.
- Update tests that reference old command descriptions, old usage strings, or old recovery/reset messaging.
- Avoid building a large new preset-specific behavior suite unless a minimal addition is necessary to keep the changed API covered.

## Implementation Steps
1. Update `tests/unit/config-command.test.ts` to reflect the new `config` subcommand structure.
2. Adjust existing registration/setup assertions so they validate nested subcommands rather than root options.
3. Update any existing tests that rely on old error/help text or old command examples.
4. If no existing suite can reasonably assert removal of top-level `raf preset`, extend the nearest existing command-registration test with the minimum needed coverage.
5. Run the relevant test suite and fix any fallout from renamed commands or changed help text.

## Acceptance Criteria
- [ ] Existing tests no longer expect `--get`, `--set`, or `--reset` on the root `config` command.
- [ ] Existing tests cover `raf config wizard` and nested `raf config preset`.
- [ ] Existing tests no longer expect a top-level `raf preset` command.
- [ ] Test scope stays focused on updating current suites rather than adding a broad new matrix.
- [ ] All tests pass.

## Notes
Because preset logic is intentionally unchanged, registration and API-surface coverage is more important here than duplicating all preset behavior tests from scratch.
