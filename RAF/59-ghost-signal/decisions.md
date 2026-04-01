# Project Decisions

## Should the `fast` key be rejected or silently ignored if present in config after removal?
Remove it as though it never existed. It will naturally be rejected as an unknown key by existing validation once removed from `VALID_MODEL_ENTRY_KEYS`.
