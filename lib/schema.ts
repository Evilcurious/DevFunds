import { rawQuery } from "./db";

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS df_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS df_sections (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'blue',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS df_users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    portal_role TEXT NOT NULL CHECK (portal_role IN ('erp_owner', 'it_ceo', 'bd_ceo', 'staff')),
    job_title TEXT NOT NULL DEFAULT '',
    section_slug TEXT,
    phone TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    bio TEXT NOT NULL DEFAULT '',
    free_time TEXT NOT NULL DEFAULT '',
    staff_status TEXT NOT NULL DEFAULT 'free' CHECK (staff_status IN ('working', 'free', 'offline', 'active')),
    token_version INTEGER NOT NULL DEFAULT 1,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // Upgrade existing live Neon df_users constraints & profile avatar column seamlessly
  `ALTER TABLE df_users ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE df_users DROP CONSTRAINT IF EXISTS df_users_staff_status_check`,
  `UPDATE df_users SET staff_status = 'working' WHERE staff_status = 'busy'`,
  `UPDATE df_users SET staff_status = 'offline' WHERE staff_status = 'not_available'`,
  `ALTER TABLE df_users ADD CONSTRAINT df_users_staff_status_check CHECK (staff_status IN ('working', 'free', 'offline', 'active'))`,

  `CREATE TABLE IF NOT EXISTS df_spending (
    id TEXT PRIMARY KEY,
    section_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Other Expense',
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    reference_note TEXT NOT NULL DEFAULT '',
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    spent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id TEXT,
    created_by_name TEXT NOT NULL DEFAULT 'Admin',
    created_by_role TEXT NOT NULL DEFAULT 'erp_owner',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS df_earnings (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_company TEXT NOT NULL DEFAULT '',
    customer_contact TEXT NOT NULL DEFAULT '',
    project_title TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    work_link TEXT NOT NULL DEFAULT '',
    amount_paid NUMERIC(14, 2) NOT NULL CHECK (amount_paid >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
    department_credit TEXT NOT NULL DEFAULT 'BD & IT',
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_id TEXT,
    created_by_name TEXT NOT NULL DEFAULT 'Admin',
    created_by_role TEXT NOT NULL DEFAULT 'erp_owner',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS df_attendance (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES df_users(id) ON DELETE CASCADE,
    work_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'late', 'half_day', 'on_leave', 'absent')),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    note TEXT NOT NULL DEFAULT '',
    marked_by_id TEXT,
    marked_by_name TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, work_date)
  )`,
  `CREATE TABLE IF NOT EXISTS df_leave_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES df_users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    section_slug TEXT,
    leave_type TEXT NOT NULL DEFAULT 'Casual Leave',
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by_name TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS df_tasks (
    id TEXT PRIMARY KEY,
    section_slug TEXT NOT NULL CHECK (section_slug IN ('bd', 'it')),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'working', 'submitted', 'completed')),
    due_date TEXT,
    reference_link TEXT NOT NULL DEFAULT '',
    submission_link TEXT NOT NULL DEFAULT '',
    completion_note TEXT NOT NULL DEFAULT '',
    accepted_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    assigned_to_id TEXT NOT NULL REFERENCES df_users(id) ON DELETE CASCADE,
    assigned_to_name TEXT NOT NULL,
    assigned_by_id TEXT,
    assigned_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // Upgrade existing live Neon df_tasks table seamlessly
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS submission_link TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ`,
  `ALTER TABLE df_tasks DROP CONSTRAINT IF EXISTS df_tasks_status_check`,
  `UPDATE df_tasks SET status = 'working' WHERE status = 'in_progress'`,
  `ALTER TABLE df_tasks ADD CONSTRAINT df_tasks_status_check CHECK (status IN ('pending', 'working', 'submitted', 'completed'))`,

  `CREATE TABLE IF NOT EXISTS df_notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES df_users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '/portals',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS df_audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  // ── Cross-CEO request columns (BD CEO ⇄ IT CEO) ────────────────────────────
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS request_kind TEXT NOT NULL DEFAULT 'direct'`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS request_status TEXT NOT NULL DEFAULT 'none'`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS origin_section TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS requested_to_role TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS accepted_by_name TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS accepted_by_id TEXT`,
  `ALTER TABLE df_tasks ADD COLUMN IF NOT EXISTS decline_reason TEXT NOT NULL DEFAULT ''`,
  // One work item can now be shared with MANY team members → assignee FK is optional
  `ALTER TABLE df_tasks ALTER COLUMN assigned_to_id DROP NOT NULL`,
  `ALTER TABLE df_tasks ALTER COLUMN assigned_to_name SET DEFAULT ''`,

  // ── Per-member assignment / progress rows so 1 task can be given to many staff ──
  `CREATE TABLE IF NOT EXISTS df_task_assignees (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES df_tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES df_users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'working', 'submitted', 'completed')),
    accepted_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    submission_link TEXT NOT NULL DEFAULT '',
    completion_note TEXT NOT NULL DEFAULT '',
    reviewed_by_name TEXT NOT NULL DEFAULT '',
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, user_id)
  )`,
  // Backfill every legacy single-assignee task into the multi-assignee table
  `INSERT INTO df_task_assignees (
     id, task_id, user_id, status, accepted_at, submitted_at, submission_link, completion_note
   )
   SELECT 'tas_' || t.id, t.id, t.assigned_to_id, t.status, t.accepted_at, t.submitted_at,
          t.submission_link, t.completion_note
   FROM df_tasks t
   WHERE t.assigned_to_id IS NOT NULL
   ON CONFLICT (task_id, user_id) DO NOTHING`,
  // Mirror legacy primary assignee from the assignment rows (keeps older reports accurate)
  `UPDATE df_tasks t
   SET assigned_to_id = agg.user_id,
       assigned_to_name = agg.names
   FROM (
     SELECT ta.task_id,
            MIN(ta.user_id) AS user_id,
            string_agg(u.name::text, ', ' ORDER BY u.name) AS names
     FROM df_task_assignees ta
     JOIN df_users u ON u.id = ta.user_id
     GROUP BY ta.task_id
   ) agg
   WHERE t.id = agg.task_id AND (t.assigned_to_id IS DISTINCT FROM agg.user_id)`,
  `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
   SELECT 'ntf_seed_' || t.id || '_' || ta.user_id,
          ta.user_id,
          'task_assigned',
          'Work Assigned (' || upper(t.section_slug) || ' Todo)',
          'You were assigned: "' || t.title || '"',
          '/portals'
   FROM df_tasks t
   JOIN df_task_assignees ta ON ta.task_id = t.id
   WHERE ta.status = 'pending' AND t.request_kind = 'direct'
     AND NOT EXISTS (
       SELECT 1 FROM df_notifications n WHERE n.id = 'ntf_seed_' || t.id || '_' || ta.user_id
     )`,

  `CREATE INDEX IF NOT EXISTS idx_df_users_section ON df_users(section_slug)`,
  `CREATE INDEX IF NOT EXISTS idx_df_users_role ON df_users(portal_role)`,
  `CREATE INDEX IF NOT EXISTS idx_df_spending_section ON df_spending(section_slug, spent_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_df_earnings_date ON df_earnings(earned_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_df_attendance_date ON df_attendance(work_date)`,
  `CREATE INDEX IF NOT EXISTS idx_df_leaves_status ON df_leave_requests(status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_df_tasks_section ON df_tasks(section_slug, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_df_tasks_assignee ON df_tasks(assigned_to_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_df_task_assignees_user ON df_task_assignees(user_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_df_task_assignees_task ON df_task_assignees(task_id)`,
  `CREATE INDEX IF NOT EXISTS idx_df_tasks_origin ON df_tasks(origin_section, request_status)`,
  `CREATE INDEX IF NOT EXISTS idx_df_notifications_recipient ON df_notifications(recipient_id, is_read, created_at DESC)`,
];

export async function runMigrations(): Promise<void> {
  for (const sql of SCHEMA_STATEMENTS) {
    await rawQuery(sql);
  }
}
