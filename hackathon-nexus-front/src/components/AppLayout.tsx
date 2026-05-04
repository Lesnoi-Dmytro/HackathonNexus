import { MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import type { NotificationDto } from "../api/notifications";
import { notificationText } from "../api/notifications.types";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { Button } from "../shared/ui/Button";
import styles from "./AppLayout.module.css";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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

  const roleLabel = user?.role === "hackathon-admin" ? "Admin" : "Participant";

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
            Messages
          </NavLink>
        </nav>

        <div className={styles.right}>
          {/* Notification bell */}
          <div className={styles.bellWrapper} ref={bellRef}>
            <button
              type="button"
              className={styles.bell}
              aria-label="Notifications"
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
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button type="button" className={styles.markAllBtn} onClick={markAllRead}>
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className={styles.notifList}>
                  {notifications.length === 0 ? (
                    <p className={styles.notifEmpty}>No notifications yet</p>
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
                        <span className={styles.notifText}>{notificationText(n.payload)}</span>
                        <span className={styles.notifTime}>{timeAgo(n.createdAt)}</span>
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
            Sign out
          </Button>
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
