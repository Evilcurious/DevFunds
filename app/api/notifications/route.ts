import { getSessionUser, jsonNoStore } from "@/lib/auth";
import { rawQuery } from "@/lib/db";
import { mapNotificationRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return jsonNoStore({ notifications: [], unreadCount: 0 });
  }

  const rows = await rawQuery<Record<string, unknown>>(
    `SELECT * FROM df_notifications
     WHERE recipient_id = $1
     ORDER BY created_at DESC
     LIMIT 30`,
    [user.id]
  );

  const notifications = rows.map(mapNotificationRow);
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return jsonNoStore({ notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    markAllRead?: boolean;
  };

  if (body.markAllRead) {
    await rawQuery(
      `UPDATE df_notifications SET is_read = TRUE WHERE recipient_id = $1`,
      [user.id]
    );
  } else if (body.id) {
    await rawQuery(
      `UPDATE df_notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2`,
      [body.id, user.id]
    );
  }

  return jsonNoStore({ ok: true });
}
