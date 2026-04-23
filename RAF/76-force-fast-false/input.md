when fast is falsy - pass it to codex as false; i mean absense of fast in config doen't mean not to
propagate it, it means false, or make fast default to false in config and make sure it passed in
codex

---

Planning clarification: upstream Codex treats omitted `service_tier` as the off/default case, so this project will not add a `service_tier=false` runtime override. The work is to document and test that RAF preserves omission for `fast: false` or unset `fast`.
