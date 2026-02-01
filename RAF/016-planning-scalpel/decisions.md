# Project Decisions

## What files should be included in the task commit?
Code + outcome + this task's plan - Commit the code changes made during the task, the outcome file, and the plan file for this specific task (e.g., 001-task-name.md). Not all plan files, just the one related to the current task.

## How should Claude determine which code files to commit?
Trust Claude's judgment - Instruct Claude to only add files it explicitly modified during the task, relying on its awareness of changes. No need to verify with git diff.
