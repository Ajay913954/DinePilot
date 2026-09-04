# DinePilot — Restaurant AI Business Partner

> **Your Restaurant's AI Business Partner**  
> *Run Your Restaurant Smarter.*

DinePilot brings reservations, customer CRM, WhatsApp communication, marketing automation, reviews, and AI-powered intelligence into one unified commercial platform.

---

## 🏗️ Architecture & Monorepo Overview

DinePilot is built as a high-performance, modular monorepo using **npm workspaces**.

```
dinepilot/
├── apps/
│   ├── web/              # Vite + React 19 + TypeScript + Tailwind CSS Frontend
│   └── api/              # Node.js + Express + TypeScript Backend API
│
├── packages/
│   ├── types/            # Shared TypeScript domain contracts & DTOs
│   ├── validation/       # Shared Zod validation schemas (Auth, Restaurant)
│   └── config/           # Shared TypeScript base configuration
│
├── prisma/
│   ├── schema.prisma     # PostgreSQL Database Schema & Relationships
│   └── seed.ts           # Development seed script
│
├── docs/                 # Architectural specifications & API guides
├── docker-compose.yml    # PostgreSQL Database Service
├── package.json          # Root Monorepo configuration & workspaces
├── .env.example          # Environment variables blueprint
└── README.md             # Project documentation
```

---

## 🔒 Authentication & Session Architecture

DinePilot uses a secure, production-ready session authentication strategy:

- **Session Tokens**: 256-bit secure random tokens generated on authentication.
- **Database Storage**: Raw session tokens are **never** stored in the database. Only a SHA-256 hash (`Session.tokenHash`) is saved.
- **Cookie Protection**: Delivered via `HttpOnly`, `SameSite=Lax` (and `Secure` in production) cookies (`dinepilot_session`). Frontend JavaScript cannot read or extract the session token.
- **Password Security**: Passwords are hashed using `bcrypt` (salt factor 10). Plaintext credentials are never saved, logged, or returned in API responses.
- **Tenant Isolation**: User authorization is verified on every request using `RestaurantUser` relationships (`requireRestaurantAccess`). Users of Restaurant A cannot access Restaurant B data (403 Forbidden).

---

## 🔑 Environment Variables

Copy `.env.example` to `.env`:

| Environment Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DB]?schema=public`) |
| `SESSION_SECRET` | Secret key for session encryption & cookie signing |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) |
| `PORT` | Backend Express server port (Default: `5000`) |
| `APP_URL` | Frontend Web application URL for CORS configuration (Default: `http://localhost:5173`) |
| `API_URL` | Backend API base URL (Default: `http://localhost:5000`) |

---

## 💻 Development & Testing Commands

| Command | Action |
|---|---|
| `npm run dev` | Start both Frontend (`http://localhost:5173`) and Backend API (`http://localhost:5000`) concurrently |
| `npm run dev:web` | Start Frontend Web App only |
| `npm run dev:api` | Start Backend Express API only |
| `npm run build` | Compile and build all workspace packages and apps |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run Prisma database migrations (`prisma migrate dev`) |
| `npm run prisma:seed` | Run development database seed script |
| `npm run prisma:studio` | Open Prisma Studio GUI for database visual inspection |
| `npx tsx apps/api/src/tests/run_auth_tests.ts` | Run authentication engine verification tests |
| `npx tsx apps/api/src/tests/run_password_tests.ts` | Run password hashing & security verification tests |
| `npx tsx apps/api/src/tests/run_security_tenant_tests.ts` | Run multi-tenant boundary isolation & token security tests |

---

## 🗺️ Roadmap & Checkpoints

- [x] **DAY 1**: Monorepo Workspace, TypeScript, Tailwind CSS, React Router v7, Express skeleton, Landing Page.
- [x] **DAY 2 — CHECKPOINT 1**: PostgreSQL Database setup, Prisma Schema definition (`User`, `Session`, `Restaurant`, `RestaurantUser`, `Role`) & Migration (`20260904134248_day2_auth_schema`).
- [x] **DAY 2 — CHECKPOINT 2**: Reusable password hashing (`hashPassword`) & verification (`verifyPassword`).
- [x] **DAY 2 — CHECKPOINT 3**: Registration API (`POST /api/auth/register`), email normalization, duplicate email detection (`EMAIL_ALREADY_EXISTS` 409).
- [x] **DAY 2 — CHECKPOINT 4**: Login (`POST /api/auth/login`), Logout (`POST /api/auth/logout`), Current User (`GET /api/auth/me`), `requireAuth` middleware, HttpOnly cookies, and rate limiting (`authLimiter`).
- [x] **DAY 2 — CHECKPOINT 5**: Frontend Auth integration (`AuthContext`), Login UI, Signup UI, `ProtectedRoute` & `PublicRoute` guards.
- [x] **DAY 2 — CHECKPOINT 6**: Security verification (SHA256 session token hashing, password hash isolation) and multi-tenant isolation tests.
