# Project Decisions

## Which elements of ultraplan-prompt.md should be incorporated into RAF's planning prompts?
Parallel codebase exploration, Self-critique pass, Risks & mitigations section, Detailed file-modification list

## When should the multi-agent exploration happen relative to the user interview?
Before interview — explore the codebase first so the LLM's interview questions are grounded in the actual code, then ask the user, then write plans.

## How should the prompt phrase the parallel-exploration instruction so it works for both Claude and Codex?
Harness-agnostic phrasing — generic language like "spawn parallel sub-agents/tasks if available; otherwise read multiple files concurrently". No tool names.

## Should amend.ts get the same depth of ultraplan workflow as planning.ts, or a lighter version?
Same depth — apply the full ultraplan workflow (exploration + critique) to amend, since amendments modify existing code and benefit from thorough exploration.

## Should the new ultraplan-style sections (Risks & Mitigations, Files to Modify) be added to the plan-file template or replace existing sections?
Add new sections — keep all existing sections, append "Files to Modify" and "Risks & Mitigations" as new sections in the plan-file template.

## How prescriptive should the parallel-exploration instructions be?
Three named exploration angles, mirroring ultraplan exactly: (1) understand existing code/architecture, (2) find files needing modification, (3) identify risks/edge-cases/dependencies.

## How should the self-critique step be structured in RAF's planning flow?
Critique each plan file before writing it. After drafting plan content for a task, critique it for missing steps/risks, revise, then write the file. Per-task loop.

## Should README.md be updated to document the new thorough-exploration planning behaviour?
No — prompts only. Prompt internals aren't user-facing CLI behaviour; README doesn't need to mention them.
