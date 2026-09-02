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
│   └── schema.prisma     # PostgreSQL Database Schema & Relationships
│
├── docs/                 # Architectural specifications & API guides
├── docker-compose.yml    # PostgreSQL Database Service
├── package.json          # Root Monorepo configuration & workspaces
├── .env.example          # Environment variables blueprint
└── README.md             # Project documentation
```

---

## 🚀 Tech Stack

### Frontend (`apps/web`)
* **Framework**: React 19, Vite, TypeScript
* **Styling**: Tailwind CSS v4, Lucide React, Glassmorphism design system
* **Routing**: React Router DOM
* **State & Data Fetching**: TanStack Query (React Query)
* **Form & Validation**: React Hook Form, Zod

### Backend (`apps/api`)
* **Runtime**: Node.js, Express.js, TypeScript
* **Authentication**: Secure HTTP-only Cookie Sessions, Bcrypt / Argon2 Hashing
* **Validation**: Zod schema middleware
* **Security**: Helmet, CORS, Rate Limiting, Cookie Parser

### Database & Infra
* **Database**: PostgreSQL 16
* **ORM**: Prisma ORM v6
* **Containerization**: Docker Compose

---

## ⚙️ Prerequisites

* **Node.js**: v20.x or higher (v24+ recommended)
* **npm**: v10.x or higher
* **Docker / PostgreSQL**: Docker Desktop (or local PostgreSQL server)

---

## 📦 Installation & Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Build internal workspace packages**:
   ```bash
   npm run build:types
   npm run build:validation
   ```

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Start PostgreSQL Database**:
   ```bash
   docker-compose up -d
   ```

5. **Run Prisma Migrations & Generate Client**:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

---

## 💻 Development Commands

| Command | Action |
|---|---|
| `npm run dev` | Start both Frontend (`http://localhost:5173`) and Backend API (`http://localhost:5000`) concurrently |
| `npm run dev:web` | Start Frontend Web App only |
| `npm run dev:api` | Start Backend Express API only |
| `npm run build` | Build all packages and applications |
| `npm run prisma:studio` | Open Prisma Studio GUI for database inspection |

---

## 🛡️ Security Best Practices

* **HTTP-only Cookies**: Authentication tokens are stored in secure, HTTP-only, SameSite cookies.
* **Tenant Isolation**: Backend middleware enforces access control based on user-restaurant relationships.
* **Input Validation**: Strict Zod validation on all incoming requests.
* **SQL Injection Protection**: Parameterized queries via Prisma ORM.

---

## 🗺️ Day 1 Roadmap & Checkpoints

- [x] **CHECKPOINT 1**: Architecture, Monorepo Workspace, TypeScript, Tailwind CSS, React Router, Express skeleton, Landing Page.
- [ ] **CHECKPOINT 2**: PostgreSQL Database setup, Prisma Schema definition & Migration.
- [ ] **CHECKPOINT 3**: Secure Authentication Engine (Signup, Login, Logout, Session Cookie, Middleware).
- [ ] **CHECKPOINT 4**: Multi-step Restaurant Onboarding & OWNER role assignment.
- [ ] **CHECKPOINT 5**: Protected Dashboard & Settings module.
- [ ] **CHECKPOINT 6**: Responsive polish, Drawer navigation, Loading & Toast system.
- [ ] **CHECKPOINT 7**: Automated authentication & multi-tenant isolation unit/integration tests.
