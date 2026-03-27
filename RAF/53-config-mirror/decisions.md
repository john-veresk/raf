# Project Decisions

## When a preset is 'linked', how should `raf config set` behave?
Symlink approach: `raf.config.json` becomes a symlink to `presets/<name>.json`. One file, zero sync logic. `raf config set` just works because it writes to the same file.

## Should `raf config preset load` always create a symlink, or opt-in with a flag?
Always symlink. Loading a preset always symlinks. The old copy behavior goes away entirely.

## When a preset is linked, should `raf config reset` unlink?
Yes. `raf config reset` deletes the symlink and restores defaults as a regular file (or no file).

## How to show which preset is linked?
Show in `raf config get` — print a note like '(linked: my-preset)' at the top when config is symlinked. No new command needed.

## What docs need updating?
Both README.md and src/prompts/config-docs.md.

## Should `preset save` also create a symlink?
Yes. `save` moves `raf.config.json` into `presets/<name>.json` and replaces it with a symlink. This way you're immediately linked after naming your config. `load` then switches the symlink to a different preset.
