# Fieldnotes — Technical Interview Preparation

A dark, focused interview preparation platform built with React, Vite, TypeScript, Tailwind CSS, Anime.js 4, and FastAPI. Department metadata and learning content are stored in JSON. Linux is the initial learning path; AWS and Azure are marked Coming Soon. No database is used.

## Requirements

- Node.js 20+ and npm
- Python 3.10+

## Run locally

Open two terminals from the repository root and run the launch scripts. The services listen on localhost for local development.

```bash
./run-backend.sh
```

```bash
./run-frontend.sh
```

On Ubuntu/Debian, if the backend script reports missing virtual environment support, install it with `sudo apt update && sudo apt install -y python3-venv python3-pip`, then run the script again.

Alternatively, start each service manually as described below.

### 1. Start the API

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows PowerShell: .venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is available at <http://127.0.0.1:8000>. Interactive API docs: <http://127.0.0.1:8000/docs>.

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. Vite proxies `/api` requests to `http://127.0.0.1:8000`. To use different ports, set `FRONTEND_PORT` (default `3000`) and/or `BACKEND_PORT` before running the scripts. The frontend proxy target can be changed with `VITE_API_PROXY`; `VITE_API_BASE_URL` can point the browser directly at a deployed API.

For remote access or production, configure a web server or reverse proxy to expose the built frontend and API securely.

## Verify

```bash
cd frontend && npm run build
cd ../backend && source .venv/bin/activate && pytest
```

## Project structure

```text
backend/
  app/
    content/departments.json   # Structured department metadata
    routes/                    # Health and department endpoints
    schemas/                   # Typed API response models
    services/                  # JSON content access
    main.py                    # FastAPI application and CORS
  tests/test_api.py
  requirements.txt
frontend/
  src/
    components/                # Shared brand, navigation, cards, terminal art
    lib/api.ts                 # Typed API client
    types/                     # Frontend data models
    App.tsx
    styles.css                 # Tailwind base and custom design system
  package.json
  vite.config.ts
 docs/
  architecture.md
  api.md
```

## API

- `GET /api/health` — `{ "status": "ok" }`
- `GET /api/departments` — department metadata from `backend/app/content/departments.json`

See [docs/api.md](docs/api.md) and [docs/architecture.md](docs/architecture.md).

## Linux learning content

Linux learning data lives in `backend/app/content/linux/` as separate `topics.json`, `questions.json`, and `commands.json` files. The current question bank contains 66 questions across 11 Linux topics. AWS and Azure remain Coming Soon with no question content.

Linux endpoints:

- `GET /api/linux/topics`
- `GET /api/linux/questions?topic=networking-dns-ssh&difficulty=advanced`
- `GET /api/linux/questions/{slug}`
- `GET /api/linux/search?q=SELinux&topic=security-selinux-firewalls&difficulty=intermediate`
- `GET /api/linux/commands`
- `GET /api/linux/copilot/exercises` — curated troubleshooting exercises linked to Linux topics and questions.

### Interactive visual learning

Open [`/linux/visual-learning`](http://localhost:3000/linux/visual-learning) from the Linux navigation or overview. The guide includes interactive SVG diagrams for Linux architecture, boot, filesystem hierarchy, process lifecycle, networking, permissions, and monitoring. Select nodes for explanations, related commands, and existing interview questions; each diagram includes a short quiz. Boot and network sequences use Anime.js v4 timelines with play, pause, replay, and reset controls. The network view animates a packet along an SVG motion path. Reduced-motion preferences disable automatic animation and keep the sequence available as manual steps. Anime.js is pinned through the lockfile at v4.5.0; install frontend dependencies with `npm install` as usual.

The floating Linux Copilot is available throughout the app. Its terminal runs an allowlisted set of commands in a browser-side virtual filesystem; it never invokes the host shell or reads host files. `mkdir` and `touch` only modify the in-memory lab, and Reset restores the sample files. Exercise definitions live in `backend/app/content/linux/copilot_exercises.json`.

Topic and difficulty filters can be combined. Difficulty accepts `beginner`, `intermediate`, or `advanced`; topic accepts an ID, slug, or exact topic name. Search query length is 2–100 characters. Invalid values return `422`; an unknown question slug returns `404`.

Run backend tests from `backend/` after activating the virtual environment:

```bash
pytest
```
