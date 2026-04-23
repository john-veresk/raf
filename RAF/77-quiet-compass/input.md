Stop RAF from printing its own post-session summary and next-step instructions after
`raf plan` and `raf plan --amend` finish.

Keep the planner agent's final completion/instruction message as the only handoff.
Leave `raf plan --resume` unchanged.
