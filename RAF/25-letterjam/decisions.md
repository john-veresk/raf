# Project Decisions

## Should task IDs also switch to pure letters (base26)?
Only project IDs. Task IDs stay base36 (0-9a-z, 2-char).

## What should the ID width be?
6 characters, padded with 'a' (the base26 zero-equivalent). So a=0, b=1, ..., z=25. Value 0 = "aaaaaa", value 1 = "aaaaab", value 26 = "aaaaba". This gives 26^6 = ~308M values (~9.8 years from epoch).

## How should existing projects with old ID formats be handled?
A `raf migrate` CLI command that renames old project folders to new base26 encoding. Should support both old sequential 3-char base36 IDs (e.g., "007-project") and current 6-char base36 IDs (e.g., "021h44-project").

## Should old IDs be auto-detected transparently in resolution?
No — the migrate command is the transition path. After migration, only base26 IDs are recognized.
