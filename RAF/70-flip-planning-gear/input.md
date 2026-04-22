For interactive mode, drop exec:

  codex -c 'service_tier="fast"'

  That starts the TUI with Fast mode for that session only. If you also want to start with an initial prompt:

  codex -c 'service_tier="fast"' "review this repo for dead code"

---

for codex harness model object setting add new bool field 'fast' by deafult undefined/falsy, so it
    will be {harness,model,fast?} object. so the user can configure fast mode for planning for
    example and no fast for execution
