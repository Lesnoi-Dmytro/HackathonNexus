import { Loader2, MessageSquarePlus, Send, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  type ChatMemberDto,
  type ChatRoomDto,
  type MessageDto,
  getChatRooms,
  getMessages,
  getOrCreateDirectRoom,
  getOrCreateTeamRoom,
} from "../api/chat";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { getSocket } from "../services/socketService";
import styles from "./ChatPage.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

type DisplayMessage = MessageDto & { pending?: boolean; tempId?: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRoomLabel(
  room: ChatRoomDto,
  myUserId: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (room.type === "team") {
    return room.teamName ?? t("chat.teamRoom", { count: room.members.length });
  }
  const other = room.members.find((m) => m.id !== myUserId);
  return other ? `${other.firstName} ${other.lastName}` : t("chat.directMessage");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string, t: (key: string) => string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return t("chat.today");
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return t("chat.yesterday");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ChatPage() {
  const { token, user } = useAuth();
  const { toast } = useNotifications();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rooms, setRooms] = useState<ChatRoomDto[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const activeRoom = rooms.find((r) => r.id === activeRoomId) ?? null;

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const [showMembers, setShowMembers] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Load rooms ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) return;
    setLoadingRooms(true);
    getChatRooms(token)
      .then((data) => {
        setRooms(data);
        // Auto-select from query param or first room
        const qRoom = searchParams.get("room");
        const target = qRoom ? data.find((r) => r.id === qRoom) : data[0];
        if (target) setActiveRoomId(target.id);
      })
      .catch(() => toast(t("common.error"), t("chat.errorLoadRooms"), "destructive"))
      .finally(() => setLoadingRooms(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Load messages when room changes ────────────────────────────────────────

  useEffect(() => {
    if (!token || !activeRoomId) return;
    setMessages([]);
    setHasMore(false);
    setLoadingMessages(true);
    getMessages(token, activeRoomId, { limit: 50 })
      .then((data) => {
        // API returns newest-first; reverse for display
        setMessages([...data].reverse());
        setHasMore(data.length === 50);
        // Sync query param
        setSearchParams({ room: activeRoomId }, { replace: true });
      })
      .catch(() => toast(t("common.error"), t("chat.errorLoadMessages"), "destructive"))
      .finally(() => setLoadingMessages(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeRoomId]);

  // ── Scroll to bottom on new messages ───────────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Socket: receive messages ────────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function onMessage(msg: MessageDto) {
      setMessages((prev) => {
        if (msg.chatRoomId === activeRoomId) {
          // Replace a pending optimistic message from self with the confirmed one
          const pendingIdx = prev.findIndex(
            (m) => m.pending && m.content === msg.content && m.sender.id === msg.sender.id,
          );
          if (pendingIdx !== -1) {
            const updated = [...prev];
            updated[pendingIdx] = msg;
            return updated;
          }
          // Avoid duplicates
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        }
        return prev;
      });
      // Bring room to top
      setRooms((prev) => {
        const idx = prev.findIndex((r) => r.id === msg.chatRoomId);
        if (idx <= 0) return prev;
        const updated = [...prev];
        const [room] = updated.splice(idx, 1);
        return [room, ...updated];
      });
    }

    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:message", onMessage);
    };
  }, [activeRoomId]);

  // ── Load more (older) messages ─────────────────────────────────────────────

  async function loadMore() {
    if (!token || !activeRoomId || !hasMore || loadingMore) return;
    const oldest = messages[0];
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const older = await getMessages(token, activeRoomId, {
        before: oldest.createdAt,
        limit: 50,
      });
      setMessages((prev) => [...[...older].reverse(), ...prev]);
      setHasMore(older.length === 50);
    } catch {
      toast(t("common.error"), t("chat.errorLoadMore"), "destructive");
    } finally {
      setLoadingMore(false);
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (!content || !activeRoomId || sending) return;
    const socket = getSocket();
    if (!socket) {
      toast(t("common.error"), t("common.notConnected"), "destructive");
      return;
    }

    // Optimistic update — show message immediately
    const tempId = `pending-${Date.now()}-${Math.random()}`;
    const optimistic: DisplayMessage = {
      id: tempId,
      chatRoomId: activeRoomId,
      sender: {
        id: String(user!.id),
        firstName: user!.firstName,
        lastName: user!.lastName,
      },
      content,
      createdAt: new Date().toISOString(),
      pending: true,
      tempId,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);

    socket.emit("chat:send", { roomId: activeRoomId, content }, (err) => {
      setSending(false);
      if (err) {
        toast(t("common.error"), err, "destructive");
        // Remove the failed optimistic message
        setMessages((prev) => prev.filter((m) => m.tempId !== tempId));
      }
    });
  }, [draft, activeRoomId, sending, toast, user, t]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Open DM with a specific user ────────────────────────────────────────────

  async function handleOpenDm(targetUserId: string) {
    if (!token) return;
    try {
      const room = await getOrCreateDirectRoom(token, targetUserId);
      setRooms((prev) => {
        if (prev.some((r) => r.id === room.id)) return prev;
        return [room, ...prev];
      });
      setActiveRoomId(room.id);
    } catch (err) {
      toast(
        t("common.error"),
        err instanceof Error ? err.message : t("chat.errorOpenDm"),
        "destructive",
      );
    }
  }

  // ── Open DM from member chip ────────────────────────────────────────────────

  function handleMemberDm(member: ChatMemberDto) {
    if (!user || member.id === String(user.id)) return;
    handleOpenDm(member.id);
    setShowMembers(false);
  }

  // ── Open team room (called externally via URL) ─────────────────────────────

  useEffect(() => {
    const teamId = searchParams.get("openTeam");
    if (!teamId || !token) return;
    getOrCreateTeamRoom(token, teamId)
      .then((room) => {
        setRooms((prev) => {
          if (prev.some((r) => r.id === room.id)) return prev;
          return [room, ...prev];
        });
        setActiveRoomId(room.id);
        setSearchParams({ room: room.id }, { replace: true });
      })
      .catch((err) =>
        toast(
          "Error",
          err instanceof Error ? err.message : "Could not open team chat",
          "destructive",
        ),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <span className={styles.sidebarTitle}>{t("chat.sidebarTitle")}</span>
        </div>

        <div className={styles.roomList}>
          {loadingRooms && <p className={styles.stateMsg}>{t("chat.loadingRooms")}</p>}
          {!loadingRooms && rooms.length === 0 && (
            <p className={styles.stateMsg}>{t("chat.noChats")}</p>
          )}
          {rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`${styles.roomItem} ${room.id === activeRoomId ? styles.roomActive : ""}`}
              onClick={() => setActiveRoomId(room.id)}
            >
              <span className={styles.roomName}>
                {getRoomLabel(room, user ? String(user.id) : "", t)}
              </span>
              <span
                className={`${styles.roomBadge} ${room.type === "team" ? styles.badgeTeam : styles.badgeDm}`}
              >
                {room.type === "team" ? t("chat.team") : t("chat.dm")}
              </span>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Main pane ── */}
      <div className={styles.pane}>
        {!activeRoom ? (
          <div className={styles.empty}>
            <MessageSquarePlus size={48} opacity={0.2} />
            <p>{t("chat.selectConversation")}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className={styles.paneHeader}>
              <div className={styles.paneHeaderLeft}>
                <span className={styles.paneName}>
                  {getRoomLabel(activeRoom, user ? String(user.id) : "", t)}
                </span>
                <span
                  className={`${styles.roomBadge} ${activeRoom.type === "team" ? styles.badgeTeam : styles.badgeDm}`}
                >
                  {activeRoom.type === "team" ? t("chat.team") : t("chat.dm")}
                </span>
              </div>
              <button
                type="button"
                className={styles.membersBtn}
                title="Members"
                onClick={() => setShowMembers((v) => !v)}
              >
                <Users size={16} />
                <span>{activeRoom.members.length}</span>
              </button>
            </div>

            {/* Members panel */}
            {showMembers && (
              <div className={styles.membersPanel}>
                <div className={styles.membersPanelHeader}>
                  <span>{t("chat.members")}</span>
                  <button
                    type="button"
                    className={styles.closeBtn}
                    onClick={() => setShowMembers(false)}
                  >
                    <X size={14} />
                  </button>
                </div>
                {activeRoom.members.map((m) => (
                  <div key={m.id} className={styles.memberRow}>
                    <span className={styles.memberAvatar}>
                      {m.firstName[0]}
                      {m.lastName[0]}
                    </span>
                    <span className={styles.memberName}>
                      {m.firstName} {m.lastName}
                    </span>
                    {user && m.id !== String(user.id) && (
                      <button
                        type="button"
                        className={styles.dmMemberBtn}
                        title={t("chat.sendDm")}
                        onClick={() => handleMemberDm(m)}
                      >
                        <MessageSquarePlus size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Messages */}
            <div className={styles.messages}>
              {loadingMessages && <p className={styles.stateMsg}>{t("chat.loadingMessages")}</p>}

              {!loadingMessages && hasMore && (
                <button
                  type="button"
                  className={styles.loadMoreBtn}
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t("common.loading") : t("chat.loadOlderMessages")}
                </button>
              )}

              {!loadingMessages && messages.length === 0 && (
                <p className={styles.stateMsg}>{t("chat.noMessages")}</p>
              )}

              {messages.map((msg, i) => {
                const isMine = msg.sender.id === String(user?.id);
                const prevMsg = messages[i - 1];
                const showSender = !prevMsg || prevMsg.sender.id !== msg.sender.id;
                const showDateSep =
                  !prevMsg || formatDate(prevMsg.createdAt, t) !== formatDate(msg.createdAt, t);

                return (
                  <div key={msg.id}>
                    {showDateSep && (
                      <div className={styles.dateSep}>
                        <span>{formatDate(msg.createdAt, t)}</span>
                      </div>
                    )}
                    <div className={`${styles.msgRow} ${isMine ? styles.mine : styles.theirs}`}>
                      {!isMine && (
                        <button
                          type="button"
                          className={styles.avatar}
                          title={`${msg.sender.firstName} ${msg.sender.lastName}`}
                          onClick={() => handleMemberDm(msg.sender)}
                        >
                          {msg.sender.firstName[0]}
                          {msg.sender.lastName[0]}
                        </button>
                      )}
                      <div className={styles.msgBody}>
                      {showSender && !isMine && (
                          <button
                            type="button"
                            className={styles.senderName}
                            onClick={() => handleMemberDm(msg.sender)}
                            title={t("chat.sendDm")}
                          >
                            {msg.sender.firstName} {msg.sender.lastName}
                          </button>
                        )}
                        <div
                          className={`${styles.bubble} ${isMine ? styles.bubbleMine : styles.bubbleTheirs}${msg.pending ? ` ${styles.bubblePending}` : ""}`}
                        >
                          {msg.content}
                        </div>
                        <span className={styles.msgTime}>
                          {msg.pending && <Loader2 size={10} className={styles.pendingIcon} />}
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className={styles.composer}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                placeholder={t("chat.messagePlaceholder")}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={4000}
              />
              <button
                type="button"
                className={styles.sendBtn}
                onClick={handleSend}
                disabled={!draft.trim() || sending}
                title="Send"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
