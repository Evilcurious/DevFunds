# DevFunds — Operations, Revenue, Spending, Staff & Attendance ERP

Full-stack Next.js 15 + PostgreSQL (Neon Serverless & VPS Postgres ready) management platform with a **Blue & White** default theme and built-in **Dark / White Mode** toggle.

## Core Modules

1. **Dashboard (`/`)** — Opens immediately on visit:
   - **Total Customers**, **Total Earning**, **Total Spending**, and **Total Staff** (clicking **Total Staff** opens `/staff`)
   - Live **Net Profit** (`Total Earning - Total Spending`), BD vs IT spend breakdown, Today's Attendance summary, and latest top-up activity feeds.
2. **Staff & Dynamic Sections (`/staff`)**:
   - Displays all staff grouped into **BD**, **IT**, and any custom sections with roles, live status (`Active`, `Free`, `Busy`, `Not Available`), contact details, skills, bio, and free-time availability.
   - Add new sections, remove sections, add staff to sections, and divide/move staff between sections.
3. **Spending (`/spending`)**:
   - **3 Sections**: **BD**, **IT**, and **Total** combined feed.
   - Displays expenses as detailed receipt/top-up messages showing where and how much money was spent.
4. **Earning (`/earning`)**:
   - Single unified stream of successful customers added by BD & IT leadership showing customer details, amount paid, and clickable **link of work done by the IT team**.
5. **Attendance (`/attendance`)**:
   - Daily & monthly staff attendance ledger filterable by date and section.
6. **4 Role Portals (`/portals`)**:
   - **ERP Owner Portal**: Full control across spending, customer earnings, sections, all CEO & staff accounts, attendance, currency (`PKR` / `USD` / `AED` / `GBP` / `EUR`), and audit logs.
   - **IT CEO Portal**: Add/edit IT spending, add/edit customers & IT work links, create IT staff accounts, edit IT staff status (`Active`, `Free`, `Busy`, `Not Available`), mark IT attendance.
   - **BD CEO Portal**: Add/edit BD spending, add/edit customers & payment details, create BD staff accounts, edit BD staff status (`Active`, `Free`, `Busy`, `Not Available`), mark BD attendance.
   - **Staff Portal**: View workspace overview & self-update status, skills, bio, free time, and daily check-in/out attendance.

## Initial Executive Portal Logins

| Portal | Email | Initial Password |
| :--- | :--- | :--- |
| **ERP Owner Portal** | `owner@devzard.app` | `Owner@123` |
| **IT CEO Portal** | `it.ceo@devzard.app` | `ItCeo@123` |
| **BD CEO Portal** | `bd.ceo@devzard.app` | `BdCeo@123` |
| **Staff Portal** | Created by IT CEO / BD CEO / ERP Owner | Custom password set by CEO/Owner |

*(Change default passwords anytime inside **Portals → Settings**.)*

---

## Deploying to Vercel + Neon PostgreSQL

1. Import repository in Vercel (Framework Preset: **Next.js**).
2. In **Vercel Dashboard → Storage**, connect your **Neon Serverless Postgres** database (`DATABASE_URL` / `POSTGRES_URL` is injected automatically).
3. Deploy — all `df_*` tables, default sections (`BD` & `IT`), and initial executive logins bootstrap automatically on first request with clean `0` balances.

## Deploying to a Linux VPS (Docker Compose OR PM2 + Nginx)

### Option A: Docker Compose (App + PostgreSQL 16 in 1 Command)
```bash
docker compose up -d --build
```

### Option B: Bare-Metal Node 22 + PM2
```bash
cp .env.example .env
# Set DATABASE_URL=postgresql://user:pass@localhost:5432/devfunds in .env
npm ci
npm run build
npx pm2 start ecosystem.config.cjs
```
