# Architecture

The frontend is a single-page React application. It requests department metadata from the FastAPI service through Vite's `/api` development proxy. The interface has loading and fallback states so the department cards stay understandable during API downtime.

The backend exposes read-only metadata endpoints. `backend/app/services/departments.py` loads the structured JSON file and validates each item against a Pydantic schema. The JSON file is the content source of truth; the application has no database, ORM, or database server dependency.

Linux is the completed systems learning path and its topics, interview questions, and command reference are stored in versioned JSON files. The floating Linux Copilot serves curated troubleshooting exercises from JSON and runs its allowlisted command simulator in the browser against an in-memory virtual filesystem. AWS Cloud is available at `/aws` with 14 JSON-backed topic guides, 112 original interview questions, 12 interactive SVG architectures at `/aws/visual-learning`, and 12 simulated incident labs at `/aws/troubleshooting`. Diagram and lab records reference existing AWS topics, questions, and architecture nodes; read-only JSON is served by FastAPI. Lab completion and best scores are stored in browser local storage. AWS content is isolated under `backend/app/content/aws/`. Azure administration and the separate AZ-900 certification course use their own routes and JSON content under `backend/app/content/azure/`.

The visual system uses CSS custom properties, Tailwind's base layers, responsive CSS, inline Lucide icons, and CSS-built terminal art. Browser persistence for bookmarks and progress can be added later without changing the metadata API.
