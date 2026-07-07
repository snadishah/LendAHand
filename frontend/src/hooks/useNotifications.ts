import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";
import type { NotificationItem } from "../types";

const POLL_INTERVAL_MS = 15000;

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    const [{ notifications }, { count }] = await Promise.all([
      apiGet<{ notifications: NotificationItem[] }>("/notifications"),
      apiGet<{ count: number }>("/notifications/unread-count"),
    ]);
    setNotifications(notifications);
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const markRead = useCallback(
    async (id: number) => {
      await apiPatch(`/notifications/${id}/read`);
      await refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    await apiPatch("/notifications/read-all");
    await refresh();
  }, [refresh]);

  return { notifications, unreadCount, markRead, markAllRead, refresh };
}
