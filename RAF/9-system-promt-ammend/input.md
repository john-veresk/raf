- [ ] add support for model override for plan and do (--sonnet or --model sonnet|haiku|opus)
- [ ] append claude prompt (our "system" prompts that RAF passes as a user gives them low preference). search web on how to apped system prompt. here is what is found ```System Prompt with Append (Session-Level Enhancement)
Using the append method preserves Claude Code’s built-in functionality while adding custom instructions: systemPrompt: {
  type: "preset",
  preset: "claude_code",
  append: "Always include detailed docstrings and implement error handling. Run tests after every feature."
}
This approach is ideal for Ralph iterations where you want to add iteration-specific guidance without losing tool definitions or core Claude Code behavior. The appended instructions appear directly above tool definitions in the system prompt hierarchy, giving them strong precedence.```
- [ ] make sure on retry claude caude recieves outcome file from previous run (failure description should help). add to task prompt improved version of this: "this is Nth attemnt at executing this plan. previous attemt give this <path to outcome file>. account for it in your task execution"
