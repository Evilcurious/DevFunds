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
5. **Attendance (`/attendance`) — self-marked only**:
   - The work day rolls over every day at **4:00 AM** (workspace timezone); the board, stats and history all follow that cycle.
   - Split into the **IT Team** and **BD Team** sections (both CEOs are listed inside their own team, first).
   - **Only the account holder can mark their own attendance.** Nobody — not the other CEO, not even the ERP Owner — can mark, change or clear somebody else's day. Attempting it returns `403`.
   - A marked member glows (name + profile photo), and clicking the mark opens their attendance stats & full history; clicking the name/photo opens their profile.
   - Daily & monthly ledger filterable by date, plus a leave-request queue (leave may only be filed by the member, their own CEO, or the ERP Owner).
6. **Work & Todo channels (`/todo`)**:
   - Two lanes: **1 · BD Todo** and **2 · IT Todo**, plus **3 · Requests Received** / **4 · Requests Sent** for the CEOs.
   - **One work item can be assigned to many team members at once.** Every member has their own progress row: `Pending → Working → Submitted → Completed`, and the parent task status rolls up automatically (e.g. `2/3` completed).
   - **CEO-to-CEO work requests:** the BD CEO can request work from the IT CEO (and the other way round). The request appears in the receiving CEO's queue, where they **Accept** (and assign it to their own team, one or many members) or **Decline** with a reason. The requester is notified on acceptance, decline and final delivery, and can withdraw a still-pending request.
   - Selecting work flips the member to `Working`; submitting it notifies the CEO and releases them to `Free` (or the status they choose) once no other work is active. CEOs approve each member's part individually or all submitted parts at once.
7. **4 Role Portals (`/portals`)**:
   - **ERP Owner Portal**: Full control across spending, customer earnings, sections, all CEO & staff accounts, attendance, currency (`PKR` / `USD` / `AED` / `GBP` / `EUR`), and audit logs.
   - **IT CEO Portal**: Add/edit IT spending, add/edit customers & IT work links, create IT staff accounts, edit IT staff status (`Working`, `Free`, `Offline`, `Active`), assign IT work, answer BD CEO requests, mark their own attendance.
   - **BD CEO Portal**: Add/edit BD spending, add/edit customers & payment details, create BD staff accounts, edit BD staff status, assign BD work, answer IT CEO requests, mark their own attendance.
   - **Staff Portal**: Inbox of assigned work (select / submit to CEO), self-update status, skills, bio, free time, profile photo, and their own daily attendance mark.

Every page and API is gated: visitors are redirected to `/portals` first, and all data is unlocked only after signing in through one of the four portals.

### Permissions at a glance

| Action | ERP Owner | IT CEO | BD CEO | Staff |
| :--- | :---: | :---: | :---: | :---: |
| Mark **own** attendance | ✅ | ✅ | ✅ | ✅ |
| Mark **someone else's** attendance | ❌ | ❌ | ❌ | ❌ |
| Assign work to their department (1 or many members) | ✅ | IT only | BD only | ❌ |
| Request work from the other CEO | ❌ | ✅ | ✅ | ❌ |
| Approve submitted work / set member status | ✅ | IT only | BD only | ❌ |
| Change global theme, logo, fonts, sections | ✅ | ❌ | ❌ | ❌ |
| Change display currency, language, own profile & photo | ✅ | ✅ | ✅ | ✅ |

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
