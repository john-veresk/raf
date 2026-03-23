# Project Decisions

## For the model label change, do you want full Codex IDs like `gpt-5.3-codex` only on the live `raf do` task status line, or everywhere RAF currently shows the `codex` label?
everythere

## For the permission-bypass item, since Codex already runs with `--full-auto`, do you want me to plan: 1. a stricter/more explicit Codex automation mode beyond `--full-auto` if Codex supports it, or 2. making the current behavior configurable and explicit in RAF? Also say whether the default should be on or off.
investigate now, i got error in ../Bindnotes project what no permissions for xcodebuild test;

## For the Codex execution task, should RAF: 1. default Codex execution to the true dangerous mode (`--dangerously-bypass-approvals-and-sandbox`), or 2. add a config/CLI switch for it and keep the default safer? Also, for the model-label task: confirm that Claude labels should stay compact (`opus`, `sonnet`, `haiku`) and only Codex labels should switch to full IDs everywhere.
true dangerous mode

## Should Claude labels stay compact?
claud labels should be compact
