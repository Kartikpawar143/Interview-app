# Architecture

The frontend is a single-page React application. It requests department metadata from the FastAPI service through Vite's `/api` development proxy. The interface has loading and fallback states so the department cards stay understandable during API downtime.

The backend exposes read-only metadata endpoints. `backend/app/services/departments.py` loads the structured JSON file and validates each item against a Pydantic schema. The JSON file is the content source of truth; the application has no database, ORM, or database server dependency.

Linux is the available learning path and its topics, interview questions, and command reference are stored in versioned JSON files. The floating Linux Copilot serves curated troubleshooting exercises from JSON and runs its allowlisted command simulator in the browser against an in-memory virtual filesystem. AWS and Microsoft Azure are marked `coming_soon` and have empty topic lists.

The visual system uses CSS custom properties, Tailwind's base layers, responsive CSS, inline Lucide icons, and CSS-built terminal art. Browser persistence for bookmarks and progress can be added later without changing the metadata API.
