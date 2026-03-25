# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Quran Qaida Class Management System for 1-on-1 teaching.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: Replit Auth (OIDC/PKCE)
- **Frontend**: React + Vite (artifacts/quran-app)

## Features

- **Authentication**: Replit Auth with Teacher and Student roles
- **Schedule Types**: 
  - Schedule A: Mon/Tue/Wed = Qaida classes, Thu/Fri = Islamic Basics Test
  - Schedule B: Thu/Fri/Sat = Qaida classes, Sun/Mon = Islamic Basics Test
- **Qaida Mode**: Lesson image, Zoom button, audio recorder, teacher notes
- **Test Mode**: Islamic Basics topics (Kalma, Namaz, Wudu, Ghusl), MCQ/True-False, auto score
- **Teacher Dashboard**: Student management, topic/question management, progress, recordings
- **Audio Recording**: MediaRecorder API, uploaded to server, stored per student
- **Test Engine**: Auto-evaluated MCQ and True/False questions

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── quran-app/          # React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   ├── db/                 # Drizzle ORM schema + DB connection
│   └── replit-auth-web/    # Replit Auth browser client
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Database Schema

- `users` — Replit Auth users (id, email, first_name, last_name, role)
- `sessions` — Replit Auth sessions
- `students` — student profiles (user_id, schedule_type A/B, current_lesson, notes)
- `topics` — Islamic Basics topics (Kalma, Namaz, Wudu, Ghusl)
- `questions` — MCQ and True/False questions per topic
- `results` — student test results (student_id, topic_id, score, total_questions)
- `recordings` — audio recordings (student_id, lesson, audio_url)

## API Routes (all under /api)

- `GET /healthz` — health check
- `GET /auth/user` — current auth state
- `GET /login`, `GET /callback`, `GET /logout` — auth flow
- `GET/POST /students` — list/create students
- `GET /students/me` — current student profile
- `GET/PUT/DELETE /students/:id` — manage student
- `GET /students/:id/recordings` — student recordings
- `GET /students/:id/results` — student test results
- `GET/POST /topics` — topics
- `GET/PUT/DELETE /topics/:id` — topic with questions
- `POST /questions`, `PUT/DELETE /questions/:id` — questions
- `POST /results` — submit test result
- `POST /recordings/upload` — upload audio file
- `POST /recordings` — create recording record
- `GET /users` — all users (teacher only)

## Role Management

First user to log in becomes a student by default. To make a user a teacher, update their role in the database:
```sql
UPDATE users SET role = 'teacher' WHERE email = 'teacher@example.com';
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes
