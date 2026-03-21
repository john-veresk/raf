# Project Decisions

## For task 1, should bare `raf config` still launch the interactive config editor, with the flag behaviors becoming subcommands like `raf config get`, `raf config set`, and `raf config reset`?
do 'raf config wizard' (spell wizard right) instead for just 'raf config'

## Should preset behavior stay otherwise identical after the move to `raf config preset save|load|list|delete`, and should the old top-level `raf preset` command be removed entirely with no compatibility shim?
yes behaviour identical to preset, but under config, raf preset should be removed

## For tests, do you want just existing unit tests updated to the new API, or also new coverage for parsing/help/error behavior of the subcommands?
update existing

## For docs, should README/help text just present the new commands, or include a short breaking-change/migration note too?
just new commands update

## For the new name-generation task, should Codex-backed project naming produce 3–5 creative kebab-case suggestions like the Claude path, with permission to change Codex invocation and response parsing as needed while keeping Claude behavior unchanged and adding regression tests?
yes

## When Codex name generation returns fewer than 3 valid suggestions, should RAF still use 1–2 valid Codex suggestions and only fall back to extracted input words when the CLI completely fails or produces no usable suggestions?
Use 1–2 valid Codex suggestions if that is all Codex returns, and only fall back to extracted input words when the CLI completely fails or produces no usable suggestions.

## Should the Codex path keep the same name instructions and picker behavior as Claude, including 3–5 creative kebab-case suggestions, 1–3 words each, and the existing picker / auto-select-first flow?
same name instructions
