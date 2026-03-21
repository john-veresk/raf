# Project Decisions

## How should the project name appear in commit messages?
Use the folder name as-is (kebab-case, without the number prefix). E.g., '43-swiss-army' → 'swiss-army'.

## Where should plan/amend commit descriptions come from?
Auto-generated from plan content. Plan descriptions should be a project summary derived from input.md (e.g., 'Plan: Swiss army knife utilities for config and CLI').

## Should commit format templates be configurable?
Yes — add template strings to raf.config.json with {projectName}, {description} placeholders.

## Should model validation keep legacy string-based validation or fully clean up?
Full cleanup — remove all legacy string-based model validation, only accept ModelEntry objects.

## How should config presets be stored and switched?
Named JSON files stored as ~/.raf/presets/<name>.json, switched with 'raf preset <name>'.

## What preset commands are needed?
Full CRUD: 'raf preset save/load/list/delete <name>'.

## Should --provider flag be removed immediately or deprecated?
Remove immediately — no users, greenfield project.

## Should 'fast' be per-model or global?
Per model entry — each ModelEntry gets fast: true/false, allowing fast planning but thorough execution.

## How should the config wizard validate model names?
Hardcoded list of known-good models in config-docs.md, supplemented with web search guidance in the wizard prompt.

## How should reasoning effort be documented?
General guidance — mention that reasoning effort is available for supporting models, link to provider docs.

## What should 'Plan:' commit descriptions look like?
Project summary style, e.g., 'Plan: Swiss army knife utilities for config and CLI' — summarized from input.md.
