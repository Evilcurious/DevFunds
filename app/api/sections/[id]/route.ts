import {
  canManageSections,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { one, rawQuery } from "@/lib/db";
import { mapSectionRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!canManageSections(user) || !user) {
    return jsonNoStore(
      { error: "Only the ERP Owner can edit sections." },
      403
    );
  }

  const { id } = await context.params;
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_sections WHERE id = $1 OR slug = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Section not found." }, 404);
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    color?: string;
  };

  const nextName =
    body.name !== undefined && body.name.trim()
      ? body.name.trim()
      : String(existing.name);
  const nextDesc =
    body.description !== undefined
      ? body.description.trim()
      : String(existing.description ?? "");
  const nextColor =
    body.color !== undefined && body.color.trim()
      ? body.color.trim()
      : String(existing.color ?? "blue");

  await rawQuery(
    `UPDATE df_sections
     SET name = $1, description = $2, color = $3
     WHERE id = $4`,
    [nextName, nextDesc, nextColor, String(existing.id)]
  );

  const updated = await one<Record<string, unknown>>(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM df_users u WHERE u.portal_role = 'staff' AND u.section_slug = s.slug) AS staff_count,
            (SELECT COALESCE(SUM(sp.amount), 0) FROM df_spending sp WHERE sp.section_slug = s.slug) AS spending_total
     FROM df_sections s WHERE s.id = $1`,
    [String(existing.id)]
  );

  await logAudit({
    actor: user,
    action: "section.updated",
    targetType: "section",
    summary: `Updated section "${nextName}"`,
  });

  return jsonNoStore({ section: updated ? mapSectionRow(updated) : null });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!canManageSections(user) || !user) {
    return jsonNoStore(
      { error: "Only the ERP Owner can remove sections." },
      403
    );
  }

  const { id } = await context.params;
  const url = new URL(request.url);
  const reassignTo = url.searchParams.get("reassignTo") || "";
  const removeStaff = url.searchParams.get("removeStaff") === "true";

  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_sections WHERE id = $1 OR slug = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Section not found." }, 404);
  }

  const slug = String(existing.slug);
  if (removeStaff) {
    await rawQuery(
      `DELETE FROM df_users WHERE portal_role = 'staff' AND section_slug = $1`,
      [slug]
    );
  } else if (reassignTo) {
    await rawQuery(
      `UPDATE df_users
       SET section_slug = $1, updated_at = NOW()
       WHERE portal_role = 'staff' AND section_slug = $2`,
      [reassignTo, slug]
    );
  } else {
    await rawQuery(
      `UPDATE df_users
       SET section_slug = NULL, updated_at = NOW()
       WHERE portal_role = 'staff' AND section_slug = $1`,
      [slug]
    );
  }

  await rawQuery(`DELETE FROM df_sections WHERE id = $1`, [
    String(existing.id),
  ]);

  await logAudit({
    actor: user,
    action: "section.deleted",
    targetType: "section",
    summary: `Removed section "${String(existing.name)}" (${slug})`,
  });

  return jsonNoStore({ ok: true });
}
