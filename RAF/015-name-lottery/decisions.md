# Project Decisions

## For the auto-generated project names, what style should the random names follow?
Use existing name generation with Claude - it gives a list of names, pick the first in the list automatically.

## Should the --auto/-y flag also skip any other interactive prompts during planning, or just the name selection?
Name only - only auto-select the project name, keep other prompts interactive.

## For task 2 (amend prompt for 'raf do'): Where exactly should the instruction to commit plan files be added?
Git commit section - add to the existing git commit instructions in the task execution prompt.

## For task 3 (input.md handling in amend): When appending to input.md, should there be a visual separator between the original and new content?
Just horizontal rule (---) between the original and new content.

