# Project Decisions

## For removing cache from status: should the cache fields be removed from UsageData/ModelTokenUsage interfaces entirely, or just hidden from display?
Remove everything — delete cache fields from interfaces, tracking, display code, and the showCacheTokens config key.

## What should the final status output look like?
Compact single line: tokens in / out + cost (e.g., `12,345 in / 6,789 out — $0.42`).

## For adding preset docs to the config wizard: what specific info should be included?
Docs + wizard actions — add docs AND teach the wizard to run preset save/load/list/delete during the session.

## What should the preset docs cover?
Just the basics — storage path, CLI commands, name validation rules. Keep it minimal.
