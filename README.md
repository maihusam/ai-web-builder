# AIWebBuilder

AIWebBuilder is a full-stack app that helps users generate, edit, and version single-page websites with AI.

It includes:

- A React + Vite frontend for project creation, editing, preview, and account flows.
- An Express backend with Better Auth, Prisma, and PostgreSQL.
- AI-powered generation and revision using the OpenAI SDK with an OpenRouter-compatible endpoint.

## Features

- Email/password authentication with Better Auth
- Create website projects from prompts
- Generate AI revisions for existing projects
- Keep version history and rollback to older versions
- Preview and save current project code
- Credit-based usage flow (5 credits per project creation or revision)

## Tech Stack

- Frontend: React 19, Vite 7, React Router 7, Tailwind CSS 4, Axios
- Backend: Node.js, Express 5, Prisma 7, PostgreSQL, Better Auth
- AI: OpenAI SDK configured for OpenRouter API
- Package manager: pnpm

## Project Structure

```text
AIWebBuilder/
  backend/
    controllers/
    routes/
    middlewares/
    prisma/
    server.js
    env.js
  frontend/
    src/
    public/
    vite.config.js
```

## Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- OpenRouter (or compatible) API key and model name

## Environment Variables

### backend/.env

Create backend/.env from backend/.env.example and set:

```env
NODE_ENV=development
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
BETTER_AUTH_SECRET=your-long-random-secret
BETTER_AUTH_URL=http://localhost:3000
AI_API_KEY=your_openrouter_api_key
AI_MODEL=openai/gpt-4o-mini
```

### frontend/.env

Create frontend/.env from frontend/.env.example and set:

```env
VITE_BASEURL=http://localhost:3000
```

## Getting Started

1. Install dependencies.

```bash
cd backend
pnpm install

cd ../frontend
pnpm install
```

2. Configure environment files using the examples above.

3. Run Prisma migration from the backend folder.

```bash
cd backend
pnpm prisma migrate dev --name init
```

4. Start backend server.

```bash
cd backend
pnpm dev
```

5. Start frontend app in another terminal.

```bash
cd frontend
pnpm dev
```

6. Open the app at http://localhost:5173.

## Available Scripts

### Backend (backend/package.json)

- pnpm dev: start backend with nodemon
- pnpm start: start backend with node

### Frontend (frontend/package.json)

- pnpm dev: start Vite dev server
- pnpm build: build production bundle
- pnpm preview: preview production build
- pnpm lint: run ESLint

## API Overview

Base URL: http://localhost:3000

Public routes:

- GET /
- ALL /api/auth/\* (Better Auth handler)

Protected user routes:

- GET /api/user/credits
- POST /api/user/project
- GET /api/user/project/:projectId
- GET /api/user/projects

Protected project routes:

- POST /api/project/revision/:projectId
- PUT /api/project/save/:projectId
- GET /api/project/rollback/:projectId/:versionId
- DELETE /api/project/:projectId
- GET /api/project/preview/:projectId

## Notes

- Backend runs on port 3000 by default.
- Frontend uses VITE_BASEURL for API/auth requests.
- Sessions are cookie-based; make sure frontend and backend URLs are configured correctly.
- AI calls are sent to https://openrouter.ai/api/v1 from backend/configs/openai.js.

## Troubleshooting

- Unauthorized responses: verify BETTER_AUTH_URL and VITE_BASEURL values and browser cookie settings.
- Prisma errors: verify DATABASE_URL and run migration again.
- AI errors: verify AI_API_KEY and AI_MODEL are set.
