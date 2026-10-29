# API reference

Base URL in development: `http://127.0.0.1:8000`

## `GET /api/health`

Returns API liveness status.

```json
{"status":"ok"}
```

## `GET /api/departments`

Returns the department metadata array. Each item includes `id`, `name`, `short_name`, `description`, `status`, `accent`, and `topics`. `status` is `available` or `coming_soon`. AWS topic IDs are supplied from its JSON topic catalogue; Linux and Azure currently have empty department-level topic lists.

## Linux learning content

Linux content is served from `backend/app/content/linux/`.

- `GET /api/linux/topics` — topics ordered by the `order` field.
- `GET /api/linux/questions` — full question bank. Optional `topic` accepts a topic ID, slug, or exact name; optional `difficulty` accepts `beginner`, `intermediate`, or `advanced`. Both filters can be combined. Unknown topic values return an empty array.
- `GET /api/linux/questions/{slug}` — one question by unique slug; returns `404` when not found.
- `GET /api/linux/search?q=keyword` — case-insensitive search across question, answer, explanation, topic, command, and follow-up text. `q` must be 2–100 characters. Supports the same optional `topic` and `difficulty` filters.
- `GET /api/linux/commands` — command reference entries with examples and operational notes.
- `GET /api/linux/copilot/exercises` — static troubleshooting exercises linked to existing topic IDs and question slugs. The route serves content only; terminal commands are handled client-side in an in-memory virtual filesystem.

Invalid query lengths or difficulty values return FastAPI's `422` validation response. The endpoints are read-only and do not require a database.

## AWS Cloud foundation

AWS content is served from `backend/app/content/aws/`.

- `GET /api/aws/topics` — 14 ordered topic guides.
- `GET /api/aws/questions` — 112-question bank; optional `q`, `topic`, and `difficulty` filters can be combined. Search covers titles, answers, examples, services, interview tips, and common mistakes.
- `GET /api/aws/questions/{slug}` — one complete question by slug, including answer, scenario, troubleshooting, tips, official references, and related question IDs; returns `404` when not found.
- `GET /api/aws/visual-learning/diagrams` — 12 interactive AWS architectures. Diagram nodes reference existing AWS topic and question IDs.
- `GET /api/aws/troubleshooting/labs` — 12 simulated troubleshooting scenarios with diagnostic evidence and choices.
- `GET /api/aws/troubleshooting/labs/{slug}` — one validated scenario by slug; returns `404` when not found.

Topic question counts are derived from question content, not hard-coded. Difficulty accepts `beginner`, `intermediate`, or `advanced`; unknown topic values return an empty list. AWS content, diagrams, and simulated labs are read-only JSON and do not require an AWS account or credentials. Lab progress and scores are kept in browser local storage.
