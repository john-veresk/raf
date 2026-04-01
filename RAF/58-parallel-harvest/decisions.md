# Project Decisions

## When multiple projects are selected, should they run sequentially or in parallel?
Sequential. Run projects one after another — simpler, no resource contention, easier to follow output.

## Should the picker default to multi-select, or require a flag?
Always multi-select. The picker always allows selecting multiple projects. Selecting one still works fine.

## Should `raf do` also accept multiple project names as CLI arguments?
Yes. Allow passing multiple project identifiers as positional args (e.g. `raf do project1 project2`), bypassing the picker.
