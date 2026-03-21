# Outcome

## Summary

Centralized user-facing model label formatting so compact aliases now render consistently across RAF command output. In particular, `gpt54` now displays as `gpt-5.4` in planning, execution status, config, and PR-generation logs, while concise Claude labels like `opus`, `sonnet`, and `haiku` remain short and readable.

## Key Changes

- Added shared display helpers in `src/utils/config.ts` that derive user-facing model labels from the existing alias-to-full-ID mapping and support explicit full-ID rendering where needed.
- Updated user-facing model logging in `src/commands/plan.ts`, `src/commands/do.ts`, `src/commands/config.ts`, and `src/core/pull-request.ts` to use the centralized formatter instead of ad hoc alias shortening.
- Updated tests in `tests/unit/config.test.ts`, `tests/unit/terminal-symbols.test.ts`, and `tests/unit/command-output.test.ts` to cover normalized display names and canonical `gpt-5.4` task/status output.

## Notes

- `npm run lint` passed.
- Full verification passed with `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false --runInBand`.

<promise>COMPLETE</promise>
