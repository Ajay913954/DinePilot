# DinePilot — Restaurant AI Business Partner

> **Your Restaurant's AI Business Partner**  
> *Run Your Restaurant Smarter.*

DinePilot brings table management, reservations, customer CRM, WhatsApp communication, marketing automation, reviews, and AI-powered intelligence into one unified commercial SaaS platform.

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
│   ├── types/            # Shared TypeScript domain contracts & DTOs (Auth, Table, Reservation, Customer)
│   ├── validation/       # Shared Zod validation schemas
│   └── config/           # Shared TypeScript base configuration
│
├── prisma/
│   ├── schema.prisma     # PostgreSQL Database Schema & Relationships
│   ├── migrations/       # Version-controlled database schema migrations
│   └── seed.ts           # Development seed script
│
├── docs/                 # Architectural specifications & API guides
├── docker-compose.yml    # PostgreSQL Database Service
├── package.json          # Root Monorepo configuration & workspaces
├── .env.example          # Environment variables blueprint
└── README.md             # Project documentation
```

---

## 🚀 Completed Modules & Capabilities

### 🔐 Day 1 & Day 2 — Secure Authentication & Multi-Tenant Infrastructure
- **PostgreSQL & Prisma ORM**: Relational schema covering `User`, `Session`, `Restaurant`, `RestaurantUser`, `Role` (`OWNER`, `MANAGER`, `STAFF`).
- **Session Protection**: Delivered via `HttpOnly`, `SameSite=Lax` cookies (`dinepilot_session`). Database stores SHA-256 hashes (`Session.tokenHash`) rather than raw tokens.
- **Password Hashing**: Passwords hashed using `bcrypt` (salt factor 10). Plaintext credentials never logged or returned.
- **Tenant Isolation**: Every database query is strictly scoped by `restaurantId` derived from the authenticated session context (`requireRestaurantAccess`).

### 🏪 Day 3 — Restaurant Onboarding, Profile & Settings
- **Multi-Step Onboarding Wizard**: Guided setup for restaurant details, location, timezone (`Asia/Kolkata` default), and operating hours.
- **Automatic Slug Generation**: URL-friendly slug generation (`the-spice-house`, `the-spice-house-1`) with collision resolution.
- **Public Profile (`/r/:slug`)**: Accessible unauthenticated route displaying public dining info while masking internal tenant data.
- **Role-Based Authorization**: `requireRestaurantRole(['OWNER', 'MANAGER'])` middleware enforcing permissions.

### 🍽️ Day 4 — Table Management & Centralized Reservation Engine
- **Table Management**: Table CRUD, location (`INDOOR`, `OUTDOOR`, `PRIVATE`, `BAR`, `OTHER`), status (`AVAILABLE`, `RESERVED`, `OCCUPIED`, `CLEANING`, `DISABLED`), and soft deletion (`isActive = false`).
- **Central Availability Engine**: Unified availability validation for Dashboard, Public Website, QR, WhatsApp, and AI. Handles past date rejection, operating hours check, exact time overlap calculation (`existing.start < req.end AND existing.end > req.start`), and smallest fitting table capacity matching (`capacity ASC`).
- **PostgreSQL Transaction Locking**: Executes reservation creation inside `prisma.$transaction` with row-level lock `SELECT ... FOR UPDATE` to eliminate concurrent double-booking race conditions.
- **Status State Machine**: Enforces valid transitions (`PENDING` → `CONFIRMED` → `SEATED` → `COMPLETED`, `CANCELLED`, `NO_SHOW`) and updates table operational statuses automatically.

### 👥 Day 5 — Customer CRM, Profiles & Customer Intelligence
- **E.164 Phone Normalization**: Normalizes input variations (`+91 98765 43210`, `919876543210`, `09876543210`, `9876543210`) into canonical `+919876543210` for zero-duplicate customer resolution.
- **Customer Profiles**: Supports DOB, internal staff notes, VIP status flag, preferred seating, dietary preferences, special occasions, and tags.
- **Classification Engine**: Dynamic categorization into `NEW` (0 visits), `RETURNING` (>=1 visits), `VIP` (`isVip = true`), and `INACTIVE` (> 90 days since last visit).
- **Customer Tagging System**: Relational tags (`CustomerTag`, `CustomerTagAssignment`) per restaurant tenant.
- **Transactional Safe Merge**: `mergeCustomers` reassigns all reservations and tags from duplicate secondary customer to primary customer, appends internal notes, and deletes secondary record safely inside a database transaction.
- **Interactive CRM UI**:
  - **Customer Directory (`/dashboard/customers`)**: Debounced search (name, phone, email), classification filter tabs, VIP filter, responsive data table, pagination, Add Customer Modal, Merge Modal.
  - **Customer Profile (`/dashboard/customers/:id`)**: Header with VIP toggle, Quick Stats grid, Guest Intelligence card, Staff Notes editor, Tags manager, and Reservation History Timeline.
  ### 📋 Day 6 — Menu Management & Digital Restaurant Catalog
- **PostgreSQL & Prisma Menu Schema**: Models covering `Menu`, `MenuCategory`, and `MenuItem` linked to `Restaurant`. Monetary fields use `@db.Decimal(10, 2)` for exact currency calculations without floating-point errors.
- **Category Delete Safety**: Prevents accidental deletion of categories containing dishes (`400 CATEGORY_HAS_ITEMS`), supporting safe item migration or forced cascading deletion.
- **Operational Availability Decoupling**: Instant kitchen availability toggle (`isAvailable`) decoupled from administrative catalog visibility (`isActive`).
- **Reordering Persist Engine**: Reorder categories and menu items with persistent zero-indexed `displayOrder` sequence.
- **Sanitized Public Digital Menu API (`/api/menu/public/:slug`)**: Exposes public catalog data strictly filtered for active categories and available items, protecting internal tenant data and audit logs.
- **Interactive Admin Menu Studio (`/dashboard/menu`)**:
  - Real-time catalog metrics (Total Categories, Active Dishes, Available vs Unavailable, Vegetarian Count).
  - Category manager modal & drag/reorder controls.
  - Dish Management Modal with Zod validation, price input, prep time, and dietary tags (`Vegetarian`, `Vegan`, `Spicy`).
  - Live Digital Menu Preview modal embedded directly in dashboard.
- **Public Customer Digital Menu (`/r/:slug` & `/r/:slug/menu`)**: Responsive customer menu page with category navigation, dish search, and dietary preference filters.

---

## 🗄️ Database Schema Blueprint

```mermaid
erDiagram
    User ||--o{ RestaurantUser : "has memberships"
    User ||--o{ Session : "has sessions"
    Restaurant ||--o{ RestaurantUser : "belongs to"
    Restaurant ||--o{ Table : "owns"
    Restaurant ||--o{ Customer : "manages"
    Restaurant ||--o{ CustomerTag : "owns tags"
    Restaurant ||--o{ Reservation : "has bookings"
    Restaurant ||--o{ Menu : "has primary menu"
    Restaurant ||--o{ AuditLog : "records"
    Menu ||--o{ MenuCategory : "contains"
    MenuCategory ||--o{ MenuItem : "contains"
    Customer ||--o{ Reservation : "places"
    Customer ||--o{ CustomerTagAssignment : "tagged with"
    CustomerTag ||--o{ CustomerTagAssignment : "assigned to"
    Table ||--o{ Reservation : "assigned to"
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env`:

| Environment Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://postgres:root@localhost:5432/dinepilot?schema=public`) |
| `SESSION_SECRET` | Secret key for session encryption & cookie signing |
| `NODE_ENV` | Application environment (`development`, `production`, `test`) |
| `PORT` | Backend Express server port (Default: `5000`) |
| `APP_URL` | Frontend Web application URL for CORS configuration (Default: `http://localhost:5173`) |
| `API_URL` | Backend API base URL (Default: `http://localhost:5000`) |

---

## 💻 Development & Test Commands

| Command | Action |
|---|---|
| `npm run dev` | Start both Frontend (`http://localhost:5173`) and Backend API (`http://localhost:5000`) concurrently |
| `npm run build` | Compile and build all workspace packages (`@dinepilot/types`, `@dinepilot/validation`, `@dinepilot/api`, `@dinepilot/web`, `@dinepilot/config`) |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Run Prisma database migrations (`prisma migrate dev`) |
| `npm run prisma:seed` | Run development database seed script |
| `npm run prisma:studio` | Open Prisma Studio GUI for database visual inspection |
| `npx tsx apps/api/src/tests/run_all_tests.ts` | **Run Master Test Suite** (Executes all 7 test suites: Auth, Tenant Boundaries, Onboarding, Reservations, Customer CRM, Menu Management, & Security) |
| `npx tsx apps/api/src/tests/run_auth_tests.ts` | Run authentication engine verification tests |
| `npx tsx apps/api/src/tests/run_security_tenant_tests.ts` | Run multi-tenant boundary isolation & token security tests |
| `npx tsx apps/api/src/tests/run_day3_onboarding_tests.ts` | Run restaurant onboarding & slug collision tests |
| `npx tsx apps/api/src/tests/run_day4_reservation_tests.ts` | Run reservation engine, concurrency locking & availability tests |
| `npx tsx apps/api/src/tests/run_day5_customer_crm_tests.ts` | Run Day 5 Customer CRM, phone normalization, classification & merge tests |
| `npx tsx apps/api/src/tests/run_day6_menu_tests.ts` | Run Day 6 Menu Management, Decimal precision, availability toggle & public API tests |
| `npx tsx apps/api/src/tests/run_day6_security_menu_tests.ts` | Run Day 6 Menu Security tests (STAFF isolation, cross-tenant relationship integrity & force-delete policy) |

---

## 🔒 Security & Multi-Tenant Boundaries

- **Tenant Isolation**: Every database operation verifies tenant authorization via `restaurantId`. Cross-tenant requests return `403 Forbidden` / `404 Not Found`.
- **Role Enforcement**: Sensitive operations (`mergeCustomers`, `deleteTable`, `deleteCustomer`, `addTag`, `deleteCategory`, `deleteMenuItem`) require `OWNER` or `MANAGER` roles via `requireRestaurantRole`.
- **Privacy Protection**: Internal customer notes are kept strictly private on authenticated backend routes and are never exposed on public restaurant endpoints (`/r/:slug`).
- **Data Veracity**: 100% of displayed operational and customer metrics come directly from real PostgreSQL queries with zero hardcoded or fake numbers.
