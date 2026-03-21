# Project Decisions

## For task 1, should bare `raf config` still launch the interactive config editor, with the flag behaviors becoming subcommands like `raf config get`, `raf config set`, and `raf config reset`?
do 'raf config wizard' (spell wizard right) instead for just 'raf config'

## Should preset behavior stay otherwise identical after the move to `raf config preset save|load|list|delete`, and should the old top-level `raf preset` command be removed entirely with no compatibility shim?
yes behaviour identical to preset, but under config, raf preset should be removed

## For tests, do you want just existing unit tests updated to the new API, or also new coverage for parsing/help/error behavior of the subcommands?
update existing

## For docs, should README/help text just present the new commands, or include a short breaking-change/migration note too?
just new commands update
