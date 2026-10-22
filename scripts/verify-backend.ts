import assert from "node:assert/strict";
import { rmSync } from "node:fs";

process.env.PGLITE_DATA_DIR = `/tmp/devfunds-test-${Date.now()}`;

async function main() {
  const { ensureBootstrapped, getAppSettings } = await import("../lib/bootstrap");
  const { one, rawQuery, toNum } = await import("../lib/db");
  const {
    canManageEarnings,
    canManageSections,
    canManageSectionSpending,
    canManageStaffSection,
  } = await import("../lib/auth");

  console.log("1. Bootstrapping fresh clean database...");
  await ensureBootstrapped();

  const settings = await getAppSettings();
  assert.equal(settings.currency, "PKR", "Default currency must be PKR");

  const sections = await rawQuery<{ slug: string }>(
    `SELECT slug FROM df_sections ORDER BY sort_order ASC`
  );
  assert.deepEqual(
    sections.map((s) => s.slug),
    ["bd", "it"],
    "Default sections must be bd and it"
  );

  const staffCount = await one<{ c: unknown }>(
    `SELECT COUNT(*)::int AS c FROM df_users WHERE portal_role = 'staff'`
  );
  const spendCount = await one<{ c: unknown }>(
    `SELECT COUNT(*)::int AS c FROM df_spending`
  );
  const earnCount = await one<{ c: unknown }>(
    `SELECT COUNT(*)::int AS c FROM df_earnings`
  );
  assert.equal(toNum(staffCount?.c), 0, "Initial staff count must be 0");
  assert.equal(toNum(spendCount?.c), 0, "Initial spending count must be 0");
  assert.equal(toNum(earnCount?.c), 0, "Initial customer count must be 0");

  const leaders = await rawQuery<{ portal_role: string; email: string }>(
    `SELECT portal_role, email FROM df_users ORDER BY portal_role ASC`
  );
  assert.equal(leaders.length, 3, "Three leadership portal logins seeded");

  console.log("2. Verifying strict 4-portal RBAC rules...");
  const owner = { portalRole: "erp_owner" } as any;
  const itCeo = { portalRole: "it_ceo" } as any;
  const bdCeo = { portalRole: "bd_ceo" } as any;
  const staff = { portalRole: "staff" } as any;

  assert.equal(canManageSectionSpending(itCeo, "it"), true);
  assert.equal(canManageSectionSpending(itCeo, "bd"), false);
  assert.equal(canManageSectionSpending(bdCeo, "bd"), true);
  assert.equal(canManageSectionSpending(bdCeo, "it"), false);
  assert.equal(canManageSectionSpending(owner, "bd"), true);
  assert.equal(canManageSectionSpending(owner, "it"), true);
  assert.equal(canManageSectionSpending(staff, "it"), false);

  assert.equal(canManageEarnings(itCeo), true);
  assert.equal(canManageEarnings(bdCeo), true);
  assert.equal(canManageEarnings(owner), true);
  assert.equal(canManageEarnings(staff), false);

  assert.equal(canManageStaffSection(itCeo, "it"), true);
  assert.equal(canManageStaffSection(itCeo, "bd"), false);
  assert.equal(canManageStaffSection(bdCeo, "bd"), true);
  assert.equal(canManageStaffSection(bdCeo, "it"), false);
  assert.equal(canManageSections(owner), true);
  assert.equal(canManageSections(itCeo), false);

  rmSync(process.env.PGLITE_DATA_DIR!, { recursive: true, force: true });
  console.log("ALL BACKEND CHECKS PASSED SUCCESSFULLY!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
