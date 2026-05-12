import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { getNotifications, markNotificationRead, type NotificationDto } from "../api/notifications";
import { notificationText, type AppNotification } from "../api/notifications.types";
import { connectSocket, disconnectSocket } from "../services/socketService";
import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "../shared/ui/Toast";

/* ── Toast state ─────────────────────────────────────────────── */
interface ToastItem {
  id: string;
  title: string;
  description: string;
  variant: "default" | "success" | "destructive";
  open: boolean;
}

/* ── Context value ───────────────────────────────────────────── */
export interface NotificationsContextValue {
  notifications: NotificationDto[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Manually add a toast (e.g. for action confirmations elsewhere). */
  toast: (title: string, description?: string, variant?: ToastItem["variant"]) => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}

/* ── Provider ────────────────────────────────────────────────── */
const POLL_INTERVAL = 60_000; // fallback poll (1 min) if socket misses events

interface Props {
  token: string | null;
  children: ReactNode;
}

function toastForNotification(
  payload: AppNotification,
  t: (key: string) => string,
): Pick<ToastItem, "title" | "variant"> {
  switch (payload.type) {
    case "team:join-request":
      return { title: t("notifications.toastJoinRequest"), variant: "default" };
    case "team:join-request:accepted":
      return { title: t("notifications.toastJoinRequestAccepted"), variant: "success" };
    case "team:join-request:rejected":
      return { title: t("notifications.toastJoinRequestRejected"), variant: "destructive" };
    case "team:invite":
      return { title: t("notifications.toastInvite"), variant: "default" };
    case "team:invite:accepted":
      return { title: t("notifications.toastInviteAccepted"), variant: "success" };
    case "team:invite:rejected":
      return { title: t("notifications.toastInviteRejected"), variant: "destructive" };
  }
}

export function NotificationsProvider({ token, children }: Props) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  /* ── helpers ─────────────────────────────────────────────── */
  const addToast = useCallback(
    (title: string, description = "", variant: ToastItem["variant"] = "default") => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev, { id, title, description, variant, open: true }]);
    },
    [],
  );

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
  }, []);

  /* ── REST fetch ──────────────────────────────────────────── */
  const fetchNotifications = useCallback(() => {
    if (!token) return;
    getNotifications(token, { limit: 50 })
      .then((page) => setNotifications(page.data))
      .catch(() => {
        /* silently ignore */
      });
  }, [token]);

  /* ── Socket connection ───────────────────────────────────── */
  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    socket.on("notification", (payload) => {
      // Re-fetch so the notification has a real UUID from the server
      fetchNotifications();

      // Fire a toast immediately without waiting for the fetch
      const { title, variant } = toastForNotification(payload, t);
      addToast(title, notificationText(payload, t), variant);
    });

    socket.on("connect_error", (err) => {
      console.warn("[WS] connection error", err.message);
    });

    return () => {
      socket.off("notification");
      socket.off("connect_error");
      disconnectSocket();
    };
  }, [token, addToast]);

  /* ── Fallback polling ────────────────────────────────────── */
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  /* ── Actions ─────────────────────────────────────────────── */
  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const updated = await markNotificationRead(token, id);
        setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      } catch {
        // ignore
      }
    },
    [token],
  );

  const markAllRead = useCallback(async () => {
    if (!token) return;
    const unread = notifications.filter((n) => !n.read);
    await Promise.allSettled(unread.map((n) => markNotificationRead(token, n.id)));
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, [token, notifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, markRead, markAllRead, toast: addToast }}
    >
      <ToastProvider swipeDirection="right">
        {children}

        {toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            open={t.open}
            onOpenChange={(open) => {
              if (!open) closeToast(t.id);
            }}
            duration={5000}
          >
            <ToastTitle>{t.title}</ToastTitle>
            <ToastDescription>{t.description}</ToastDescription>
            <ToastClose />
          </Toast>
        ))}

        <ToastViewport />
      </ToastProvider>
    </NotificationsContext.Provider>
  );
}
