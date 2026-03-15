import {
    fetchNotifications,
    markAllRead,
    markNotificationRead,
} from "@/services/notification.service";
import {
    joinUserRoom,
    startNotificationListeners,
    stopNotificationListeners,
} from "@/socket/notification.client";
import { useAuth } from "@/stores/auth.store";
import { create } from "zustand";

type Notification = any;

type NotificationState = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  start: () => void;
  stop: () => void;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export const useNotifications = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  start: () => {
    const user = useAuth.getState().user;
    if (!user) return;

    joinUserRoom(user._id);

    startNotificationListeners({
      onNew: (incoming: any) => {
        if (!incoming || !incoming._id) return;
        set((state) => {
          const exists = state.notifications.find(
            (n) => String(n._id) === String(incoming._id),
          );
          let notifications = state.notifications.slice();
          if (exists) {
            notifications = notifications.map((n) =>
              String(n._id) === String(incoming._id) ? incoming : n,
            );
          } else {
            notifications = [incoming, ...notifications];
          }

          const inc = incoming.isRead ? 0 : 1;

          return {
            notifications,
            unreadCount: state.unreadCount + inc,
          };
        });
      },
      onUpdate: (incoming: any) => {
        if (!incoming || !incoming._id) return;

        set((state) => {
          const notifications = state.notifications
            .slice()
            .filter((n) => String(n._id) !== String(incoming._id));
          return { notifications: [incoming, ...notifications] };
        });
      },
      onUnread: (count: number) => {
        set({ unreadCount: count });
      },
    });
  },
  stop: () => {
    stopNotificationListeners();
  },
  refresh: async () => {
    set({ loading: true });
    try {
      const res = await fetchNotifications({ page: 1, limit: 50 });
      let notifications = res.data.notifications || [];

      notifications = notifications.sort(
        (a: any, b: any) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      const total = res.data.total || 0;
      const unread = notifications.filter((n: any) => !n.isRead).length;
      set({ notifications, unreadCount: unread });
    } catch (e) {
      console.error("refresh notifications error", e);
    } finally {
      set({ loading: false });
    }
  },
  markRead: async (id: string) => {
    const prev = get().notifications.slice();
    const prevCount = get().unreadCount;

    set((state) => ({
      notifications: state.notifications.map((n) =>
        String(n._id) === String(id) ? { ...n, isRead: true } : n,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));

    try {
      await markNotificationRead(id);
    } catch (e) {
      console.error("mark read error", e);

      set({ notifications: prev, unreadCount: prevCount });
    }
  },
  markAllRead: async () => {
    const prev = get().notifications.slice();
    const prevCount = get().unreadCount;
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    try {
      await markAllRead();
    } catch (e) {
      console.error("mark all read error", e);
      set({ notifications: prev, unreadCount: prevCount });
    }
  },
}));

{
  let prevUser = useAuth.getState().user;
  useAuth.subscribe((state) => {
    const user = state.user;
    const svc = useNotifications.getState();
    if (user && !prevUser) {
      void svc.refresh();
      svc.start();
    }
    if (!user && prevUser) {
      svc.stop();
      useNotifications.setState({ notifications: [], unreadCount: 0 });
    }
    prevUser = user;
  });
}

{
  const initialUser = useAuth.getState().user;
  if (initialUser) {
    const svc = useNotifications.getState();
    void svc.refresh();
    svc.start();
  }
}

export default useNotifications;
