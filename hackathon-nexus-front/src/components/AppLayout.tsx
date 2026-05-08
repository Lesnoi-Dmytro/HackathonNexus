import { MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import type { NotificationDto } from "../api/notifications";
import { notificationText } from "../api/notifications.types";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { Button } from "../shared/ui/Button";
import styles from "./AppLayout.module.css";
import { LanguageSwitcher } from "./LanguageSwitcher";

function timeAgo(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("notifications.justNow");
  if (mins < 60) return t("notifications.minutesAgo", { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t("notifications.hoursAgo", { count: hrs });
  return t("notifications.daysAgo", { count: Math.floor(hrs / 24) });
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleNotificationClick(n: NotificationDto) {
    if (n.read) return;
    await markRead(n.id);
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : "?";

  const roleLabel =
    user?.role === "hackathon-admin" ? t("roles.admin") : t("roles.participant");

  return (
    <div className={styles.layout}>
      {/* ── Topbar ── */}
      <header className={styles.topbar}>
        <Link to="/hackathons" className={styles.brand}>
          Hackathon Nexus
        </Link>

        <nav className={styles.nav}>
          <NavLink
            to="/chat"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
            }
          >
            <MessageSquare size={16} />
            {t("nav.messages")}
          </NavLink>
        </nav>

        <div className={styles.right}>
          {/* Notification bell */}
          <div className={styles.bellWrapper} ref={bellRef}>
            <button
              type="button"
              className={styles.bell}
              aria-label={t("notifications.title")}
              onClick={() => setDropdownOpen((v) => !v)}
            >
              <BellIcon />
              {unreadCount > 0 && (
                <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
              )}
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <span>{t("notifications.title")}</span>
                  {unreadCount > 0 && (
                    <button type="button" className={styles.markAllBtn} onClick={markAllRead}>
                      {t("notifications.markAllRead")}
                    </button>
                  )}
                </div>
                <div className={styles.notifList}>
                  {notifications.length === 0 ? (
                    <p className={styles.notifEmpty}>{t("notifications.empty")}</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`${styles.notifItem} ${!n.read ? styles.notifUnread : ""}`}
                        onClick={() => handleNotificationClick(n)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(n)}
                      >
                        <span
                          className={`${styles.notifDot} ${n.read ? styles.notifDotRead : ""}`}
                        />
                        <span className={styles.notifText}>{notificationText(n.payload, t)}</span>
                        <span className={styles.notifTime}>{timeAgo(n.createdAt, t)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User info */}
          <div className={styles.userChip}>
            <div className={styles.avatar} aria-hidden="true">
              {initials}
            </div>
            <div>
              <div className={styles.userName}>
                {user?.firstName} {user?.lastName}
              </div>
              <div className={styles.userRole}>{roleLabel}</div>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={handleLogout}>
            {t("nav.signOut")}
          </Button>
          <LanguageSwitcher />
        </div>
      </header>

      {/* ── Page content ── */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
