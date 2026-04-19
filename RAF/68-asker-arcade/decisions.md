# Project Decisions

## Q&A

### 2026-04-19

Q: Ты хочешь `prompt-only` изменение или ещё fallback на стороне RAF?
1. `Prompt-only` — ветвим planning/amend prompt по harness: для Claude пишем `AskUserQuestion`, для Codex пишем `request_user_input`.
2. `Prompt + fallback` — если Codex/версия/режим не даст `request_user_input`, RAF должен сам деградировать в текстовые вопросы или отдельный UI.

A: 1

Q: Для ветки `codex` нужно только заменить инструмент интервью, или сделать более глубокий codex-specific prompt?
1. Только tool swap: оставить текущий RAF planning prompt почти как есть, но заменить `AskUserQuestion` на `request_user_input` и явно описать expected multiple-choice UI.
2. Полноценный codex-tailored prompt: кроме tool swap, адаптировать стиль под Codex plan mode из official prompt guidance там, где это совместимо с RAF workflow.

A: 1

Q: Как трактовать интеграционный риск с Codex mode/config?
1. `Best effort` — меняем только prompt, а в README/плане явно фиксируем prerequisite: для Codex нужен режим/конфиг, где доступен `request_user_input`.
2. `Reliable` — задача должна включать поиск и реализацию способа, чтобы RAF сам запускал Codex planning в `Plan` mode или эквивалентной конфигурации, если это поддерживается CLI.

A: 2

Q: Когда `models.plan.harness = "codex"`, RAF должен сам принудительно включать Codex `Plan mode` для всех planning/amend sessions, или это должно быть отдельной opt-in настройкой RAF?
1. Автоматически всегда для planning/amend на Codex.
2. Через отдельную RAF-настройку/флаг, по умолчанию не включать.

A: 1

Q: Как совместить это с обычным правилом RAF "новые фичи делать конфигурируемыми"?

A: Жестко; режим планирования есть режим планирования.
