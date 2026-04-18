# Project Decisions

## Q: Do you want `-y` to become the default behavior for plain `raf plan` (so permission-skipping is on even without passing `-y`), or do you mean that inside `raf plan -y`, any confirmation prompt should default to “Yes”?
A: Remove the flag entirely. Planning mode should always run in dangerous mode; execution already does.

## Q: Should `-y/--auto` be removed completely so old invocations error, or should RAF keep accepting them as deprecated no-ops for one release?
A: Keep parsing `-y/--auto`, but make them silent no-ops. No error, no effect.
