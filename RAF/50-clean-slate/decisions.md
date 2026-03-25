# Project Decisions

## What should the effort display show when reasoningEffort IS configured? Should it show the reasoningEffort value from the config or the frontmatter effort label?
Show reasoningEffort from config. Display the actual reasoningEffort value from the model entry (e.g. "medium", "high"). This reflects what's actually being sent to the model. When reasoningEffort is falsy/not configured, omit it entirely.
