update prompts so context.md always gets commited (in both plan and do phases)
here is the bug logs then it's not
Merging branch "72-terminal-judo" into "main"...
⚠️  Could not clean up worktree: Failed to remove worktree at /Users/eremeev/.raf/worktrees/RAF/72-terminal-judo: Command failed: git worktree remove "/Users/eremeev/.raf/worktrees/RAF/72-terminal-judo"
fatal: '/Users/eremeev/.raf/worktrees/RAF/72-terminal-judo' contains modified or untracked files, use --force to delete it

✓ Merged "72-terminal-judo" into "main" (fast-forward)
⚠️  Could not delete merged branch: Failed to delete branch "72-terminal-judo": Command failed: git branch -D "72-terminal-judo"
error: cannot delete branch '72-terminal-judo' used by worktree at '/Users/eremeev/.raf/worktrees/RAF/72-terminal-judo'

Pushed main to remote
➜  RAF git:(main) cd /Users/eremeev/.raf/worktrees/RAF/72-terminal-judo
➜  72-terminal-judo git:(72-terminal-judo) ✗ git st
 M RAF/72-terminal-judo/context.md
