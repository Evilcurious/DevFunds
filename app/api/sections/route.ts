import { randomUUID } from "node:crypto";
import {
  canManageSections,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { one, rawQuery, toNum } from "@/lib/db";
import { slugifySection } from "@/lib/format";
import { mapSectionRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureBootstrapped();
  const rows = await rawQuery<Record<string, unknown>>(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM df_users u WHERE u.portal_role = 'staff' AND u.section_slug = s.slug) AS staff_count,
            (SELECT COALESCE(SUM(sp.amount), 0) FROM df_spending sp WHERE sp.section_slug = s.slug) AS spending_total
     FROM df_sections s
     ORDER BY s.sort_order ASC, s.created_at ASC`
  );
  return jsonNoStore({ sections: rows.map(mapSectionRow) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!canManageSections(user) || !user) {
    return jsonNoStore(
      { error: "Only the ERP Owner can create or divide sections." },
      403
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: "create" | "divide";
    name?: string;
    slug?: string;
    description?: string;
    color?: string;
    targetSlug?: string;
    staffIds?: string[];
  };

  // Bulk divide / reassign staff into an existing section
  if (body.action === "divide" && body.targetSlug) {
    const targetSec = await one<Record<string, unknown>>(
      `SELECT * FROM df_sections WHERE slug = $1`,
      [body.targetSlug]
    );
    if (!targetSec) {
      return jsonNoStore({ error: "Target section not found." }, 404);
    }
    const staffIds = Array.isArray(body.staffIds)
      ? body.staffIds.filter((id) => typeof id === "string" && id.trim())
      : [];
    if (!staffIds.length) {
      return jsonNoStore(
        { error: "Select at least one staff member to move." },
        400
      );
    }

    for (const id of staffIds) {
      await rawQuery(
        `UPDATE df_users
         SET section_slug = $1, updated_at = NOW()
         WHERE id = $2 AND portal_role = 'staff'`,
        [body.targetSlug, id]
      );
    }

    await logAudit({
      actor: user,
      action: "section.divided",
      targetType: "section",
      summary: `Moved ${staffIds.length} staff member(s) into section ${String(targetSec.name)}`,
    });

    return jsonNoStore({ ok: true, movedCount: staffIds.length });
  }

  // Create new section (optionally moving selected staff directly into it!)
  const name = String(body.name ?? "").trim();
  if (!name) {
    return jsonNoStore({ error: "Section name is required." }, 400);
  }

  const slug = slugifySection(body.slug || name);
  if (!slug) {
    return jsonNoStore(
      { error: "Section name must contain letters or numbers." },
      400
    );
  }

  const existing = await one<{ id: string }>(
    `SELECT id FROM df_sections WHERE slug = $1`,
    [slug]
  );
  if (existing) {
    return jsonNoStore(
      { error: `A section with code "${slug}" already exists.` },
      409
    );
  }

  const maxOrderRow = await one<{ max_order: unknown }>(
    `SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM df_sections`
  );
  const sortOrder = toNum(maxOrderRow?.max_order, 0) + 1;

  const id = `sec_${randomUUID().slice(0, 8)}`;
  await rawQuery(
    `INSERT INTO df_sections (id, slug, name, description, color, is_system, sort_order)
     VALUES ($1, $2, $3, $4, $5, FALSE, $6)`,
    [
      id,
      slug,
      name,
      String(body.description ?? "").trim(),
      String(body.color ?? "blue").trim() || "blue",
      sortOrder,
    ]
  );

  // If staffIds were passed during section creation ("Divide into new section"), assign them automatically
  const staffIds = Array.isArray(body.staffIds)
    ? body.staffIds.filter((s) => typeof s === "string" && s.trim())
    : [];
  for (const staffId of staffIds) {
    await rawQuery(
      `UPDATE df_users
       SET section_slug = $1, updated_at = NOW()
       WHERE id = $2 AND portal_role = 'staff'`,
      [slug, staffId]
    );
  }

  const created = await one<Record<string, unknown>>(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM df_users u WHERE u.portal_role = 'staff' AND u.section_slug = s.slug) AS staff_count,
            0 AS spending_total
     FROM df_sections s WHERE s.id = $1`,
    [id]
  );

  await logAudit({
    actor: user,
    action: "section.created",
    targetType: "section",
    summary: `Created section "${name}" (${slug})${staffIds.length ? ` with ${staffIds.length} assigned staff` : ""}`,
  });

  return jsonNoStore(
    { section: created ? mapSectionRow(created) : null },
    201
  );
}
