# Project Decisions

## What should the council mode config shape look like?
Simple boolean: `councilMode: false`. The agent decides how many sub-agents to spin up. Just conditionally inject the council prompt based on the config setting.

## How should council agents divide the work?
Per-task assignment — each agent gets assigned specific tasks to investigate. Leader collects and merges.

## Should council mode be off by default?
Off by default. User enables via `raf config set councilMode true`.

## How should the leader coordinate questions?
Leader batches questions from sub-agents and asks the user. Sub-agents don't talk to the user directly. Flow: Leader spawns agents → agents investigate → agents report questions → leader consolidates & asks user → leader distributes answers → agents produce draft plans → leader reviews, merges, writes final plans.
