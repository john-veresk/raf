# Project Decisions

## For task 1, what exact format do you want on the task line? Example: `● 01-auth-login (sonnet, low, fast) 12s`. Also, should this apply only to the compact running/completed/failed lines, or also to verbose `Model:` / retry logs?
In same places where currently model is specified. `● 01-auth-login (sonnet, low, fast) 12s`. Don't display `low` if null and `fast` if falsy (`null` or `false`).

## For task 2, what should the research task answer definitively: only exact dollar cost, or any usable post-run signal from Codex such as tokens, usage limits, or credits?
Task is not research, do research now and say if it possible to get price in dollars and input output tokens count.

## For task 3, if Codex can provide token counts but not exact price, should RAF still implement token-only summaries for Codex, or should price be shown only when it can be sourced exactly rather than estimated?
Only show price if we can source price exactly. Provide input and output tokens though.
