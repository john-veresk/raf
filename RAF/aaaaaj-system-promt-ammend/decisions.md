# Project Decisions

## For the model override flag, which CLI syntax do you prefer?
Support both `--model <name>` AND shorthand flag `--sonnet` (only one shorthand). Opus is the default for both plan and do stages.

## For system prompt append, how should RAF configure this?
Use Claude CLI's `--system-prompt-append` flag to pass RAF's prompts at system level, giving them higher precedence than passing as user messages.

## For retry context, when should the previous outcome file be passed to Claude?
On any retry - include previous outcome context on 2nd attempt and beyond, whether task failed or was interrupted.

## For retry context, should the outcome file content be embedded in the prompt or should Claude be instructed to read it?
Instruct Claude to read the outcome file - tell Claude the path to the outcome file and instruct it to read and analyze before starting.
