# Project Decisions

## For task 1: should the rename be strict and complete everywhere user-facing and internal, meaning config JSON, TypeScript property names, validation/error messages, README/examples, and tests all switch to `harness` with no `provider` mentions left except historical migration warnings if any remain?
yes, rename everythere

## For task 2: do you want display normalization limited to the two places you named, or should the plan treat it as a global rule for all model display/log output where a model alias like `gpt54` could surface?
global rule
