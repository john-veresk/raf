# Project Decisions

## Should the base36 timestamp ID be fixed-width or variable-length?
Fixed-width, 6 characters. This covers ~69 years from the shifted epoch (36^6 = 2,176,782,336 seconds).

## How should collisions be handled if two projects are created within the same second?
Increment by 1 — if timestamp ID already exists, increment until a free slot is found.

## Should existing projects using the old sequential numbering still be recognized?
Clean break. Only support the new timestamp-based format going forward.

## Unix time precision?
Seconds.

## What is the shifted epoch?
Exactly Jan 1, 2026 00:00:00 UTC (unix timestamp 1,767,225,600). All project IDs are base36(floor(current_unix_seconds) - 1,767,225,600), zero-padded to 6 chars.

## What about git commit and branch naming format?
Same pattern with new ID. Commits: `RAF[00j3k1:001] description`. Branches: `00j3k1-epoch-shift`.

## How should identifier resolution work?
Support both the 6-char base36 ID and project name substring matching (similar to current system, minus old sequential format).

## Sort order?
Sort by ID, which naturally equals chronological (creation time) order.
