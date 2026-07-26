# Escalation Triage — MCP Server

One NitroStack MCP server exposing all 5 agents from the spec as tools,
grouped by controller. Connect NitroStudio (or your own orchestrator) to
this ONE project — no juggling multiple servers.

| Agent | File | Tools it exposes |
|---|---|---|
| Signal Collector | `src/tools/signalCollector.controller.ts` | `signals_get_signals_for_customer` |
| Correlator & Risk-Scorer | `src/tools/correlator.controller.ts` | `risk_correlate_and_score` |
| Classifier & Assignment | `src/tools/classifier.controller.ts` | `classify_and_assign` |
| Notifier / Loop-Closer | `src/tools/notifier.controller.ts` | `notify_internal`, `notify_draft_customer_message`, `notify_approve_and_send`, `notify_get_pending_approvals`, `notify_mark_bug_fixed`, `notify_get_bugs_for_customer` |
| (supports Orchestrator) | `src/tools/query.controller.ts` | `query_get_customer_status`, `query_get_team_load` |

The **Orchestrator** isn't a controller here — it's whatever chat client
calls these tools (NitroStudio's built-in AI chat, or your own Claude API
call with these tools passed in). That's intentional: one server, one
connection, and the orchestrator decides which tool to call per question.

## Setup

```bash
npm install
```

### 1. Point it at your data

You said you already have data in SQLite. Two options:

- **Fastest**: set `DB_PATH` in a `.env` file to your existing `.sqlite`/`.db`
  file, then open `src/db.ts` and edit the SQL query strings (table/column
  names) to match your real schema. Everything else in the project is
  schema-agnostic and doesn't need to change.
- **No existing data yet / want the demo data**: leave `DB_PATH` unset (it
  defaults to `data/escalation.db`) and run the seed script:
  ```bash
  npx tsx data/seed.ts
  ```
  This creates 3 demo customers (one angry multi-signal billing case, one
  technical bug case, one routine onboarding question), owners per category,
  and linked bugs — including one you can mark "fixed" live during the demo.

See `data/expected_schema.sql` for the exact shape `db.ts` expects.

### 2. Run it

```bash
npm run dev     # MCP server with hot reload
# or
npm run build && npm start   # production build
```

### 3. Connect NitroStudio

Open NitroStudio → Select Project → point it at this folder → Connect.
It will detect the project, start the MCP server, and load all 11 tools.
Chat with it directly, e.g.:

- "What's going on with Acme Corp?" → calls `query_get_customer_status`
- "Who's overloaded right now?" → calls `query_get_team_load`
- "Classify and assign the Acme billing complaint" → calls
  `classify_and_assign`, then `notify_internal`
- "Has the Globex bug shipped?" → calls `notify_get_bugs_for_customer`

### 4. The approval-card flow (human-in-the-loop)

1. `notify_draft_customer_message` drafts a customer-facing message and
   returns a `notificationId` with `status: "pending_approval"`.
2. Your UI shows this as the approval card.
3. When a person clicks Approve, call `notify_approve_and_send` with that
   `notificationId` — only then is it marked sent.
4. To simulate the "bug fixed" loop-closing demo moment, call
   `notify_mark_bug_fixed` with a bug id, then draft a `resolution` message.

## Where to plug in smarter logic later (optional, skip if short on time)

- `src/tools/correlator.controller.ts` → `scoreRisk()` is currently keyword +
  volume + age heuristics. Swap for a Claude API call for real tone analysis.
- `src/tools/classifier.controller.ts` → `classify()` is currently keyword
  matching against `KEYWORD_MAP`. Swap for a Claude API call for real NLP
  classification.

Both are isolated, pure functions — safe to replace without touching
anything else.
