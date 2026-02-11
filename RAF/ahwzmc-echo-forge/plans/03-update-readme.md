---
effort: medium
---
# Task: Rewrite README benefits and add --amend vs --resume explanation

## Objective
Enhance the README to better communicate RAF's value proposition and clarify the difference between `--amend` and `--resume`.

## Context
The current README is functional but undersells RAF's capabilities. Key benefits like smart model selection, automatic PR generation, and structured decision-making are buried or absent. The difference between `--amend` (add tasks to a project) and `--resume` (resume a Claude session) is not explained.

## Dependencies
01, 02

## Requirements
- Rewrite the "Why RAF?" section to better highlight RAF's advanced capabilities
- Add clear explanation of `--amend` vs `--resume` in the Commands section
- Keep the tone confident but factual — RAF is genuinely advanced tooling
- Don't make the README excessively long; be concise and impactful

## Implementation Steps

1. **Rewrite "Why RAF?" / benefits section** to cover:
   - **Smart model selection** — RAF estimates task complexity during planning (low/medium/high effort) and automatically routes each task to the appropriate model. Simple tasks use cheaper/faster models, complex tasks get the most capable model. Configurable via `effortMapping`.
   - **Automatic PR creation** — In worktree mode, RAF can automatically create GitHub PRs with Claude-generated descriptions that summarize the original intent, key decisions made during planning, and task outcomes. Reviewers get meaningful context, not boilerplate.
   - **Structured decision-making** — The planning interview captures design decisions as reviewable artifacts (`decisions.md`). These persist alongside the code and give reviewers insight into the "why" behind changes.
   - **Context isolation** — Each task executes with fresh context. No context rot, no degradation from long sessions. The plan provides all the context Claude needs.
   - **Token efficiency** — Focused, well-planned tasks avoid the back-and-forth debugging cycles that burn tokens. Planning overhead pays for itself.
   - **Full auditability** — Every project preserves its input, decisions, plans, and outcomes as plain markdown. You can review the entire thought process, not just the final code.
   - **Retry with escalation** — Failed tasks automatically retry with a more capable model, maximizing success rate without manual intervention.
   - **Git worktree isolation** — Work happens on isolated branches without touching your working directory. Merge, PR, or leave — your choice after execution.

2. **Add `--amend` vs `--resume` explanation** near the `raf plan` section:
   - `--amend <id>`: Adds new tasks to an existing project. Opens a new planning session that sees existing tasks (with their status) and creates additional plans numbered after the last task. Use when scope grows or you want to extend a completed project.
   - `--resume <id>`: Resumes an interrupted Claude planning session. Opens Claude's session picker scoped to the project directory so you can continue exactly where you left off. Use when your planning session was interrupted (Ctrl-C, network issue, etc.) and you want to continue the conversation.

3. **Review and polish** the entire README for consistency with the new content.

## Acceptance Criteria
- [ ] "Why RAF?" section highlights at least 6 key benefits including smart model selection, PR creation, and structured decisions
- [ ] `--amend` vs `--resume` difference is clearly explained with use cases
- [ ] README reads well end-to-end — no contradictions or redundancy with new content
- [ ] No broken markdown formatting
- [ ] Tone is confident and factual

## Notes
- Look at the existing Features bullet list and "Why RAF?" section — merge/reorganize as needed rather than duplicating
- The `--resume` flag uses Claude's built-in `--resume` flag which opens a session picker — it's about continuing a Claude conversation, not about RAF project state
