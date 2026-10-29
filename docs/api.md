# API reference

Base URL in development: `http://127.0.0.1:8000`

## `GET /api/health`

Returns API liveness status.

```json
{"status":"ok"}
```

## `GET /api/departments`

Returns the department metadata array. Each item includes `id`, `name`, `short_name`, `description`, `status`, `accent`, and `topics`. `status` is `available` or `coming_soon`. The current payload contains Linux Administration, AWS Cloud, and Microsoft Azure; each has an empty `topics` list.

## Linux learning content

All Linux content is served from `backend/app/content/linux/`; AWS and Azure remain Coming Soon and have no question data.

- `GET /api/linux/topics` — topics ordered by the `order` field.
- `GET /api/linux/questions` — full question bank. Optional `topic` accepts a topic ID, slug, or exact name; optional `difficulty` accepts `beginner`, `intermediate`, or `advanced`. Both filters can be combined. Unknown topic values return an empty array.
- `GET /api/linux/questions/{slug}` — one question by unique slug; returns `404` when not found.
- `GET /api/linux/search?q=keyword` — case-insensitive search across question, answer, explanation, topic, command, and follow-up text. `q` must be 2–100 characters. Supports the same optional `topic` and `difficulty` filters.
- `GET /api/linux/commands` — command reference entries with examples and operational notes.
- `GET /api/linux/copilot/exercises` — static troubleshooting exercises linked to existing topic IDs and question slugs. The route serves content only; terminal commands are handled client-side in an in-memory virtual filesystem.

Invalid query lengths or difficulty values return FastAPI's `422` validation response. The endpoints are read-only and do not require a database.
