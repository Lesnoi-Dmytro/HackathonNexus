import {
  Check,
  ChevronLeft,
  MessageSquare,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getOrCreateTeamRoom } from "../api/chat";
import { getHackathon, type HackathonDto } from "../api/hackathons";
import {
  createTeam,
  deleteTeam,
  findMembers,
  getMyInvites,
  getMyTeam,
  getTeamRequests,
  kickMember,
  type MembersPage,
  type TeamDto,
  type TeamMemberDto,
  type TeamRequestItem,
} from "../api/teams";
import { MemberCard } from "../components/team/MemberCard";
import { TeamFilterBar } from "../components/team/TeamFilterBar";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { getSocket } from "../services/socketService";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import styles from "./TeamManagementPage.module.css";

type TeamTab = "my-team" | "create";

export function TeamManagementPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const { toast } = useNotifications();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [hackathon, setHackathon] = useState<HackathonDto | null>(null);
  const [loadingHackathon, setLoadingHackathon] = useState(true);

  const [myTeam, setMyTeam] = useState<TeamDto | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<TeamTab>("create");

  const [teamName, setTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [membersData, setMembersData] = useState<MembersPage | null>(null);
  const [membersSearch, setMembersSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);
  const membersSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedMembersSearch, setDebouncedMembersSearch] = useState("");

  const [filterPositions, setFilterPositions] = useState<string[]>([]);
  const [filterSkills, setFilterSkills] = useState<string[]>([]);
  const [filterMinExp, setFilterMinExp] = useState<number | undefined>(undefined);
  const [currentMembersPage, setCurrentMembersPage] = useState(1);

  const [pendingRequests, setPendingRequests] = useState<TeamRequestItem[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamRequestItem[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const isParticipant = user?.role === "participant";

  useEffect(() => {
    if (!token || !id) return;
    setLoadingHackathon(true);
    getHackathon(token, id)
      .then((h) => {
        const now = new Date();
        const start = new Date(h.startDate);
        const end = new Date(start.getTime() + h.durationHours * 3_600_000);
        if (!h.isRegistered || start <= now || end <= now) {
          navigate(`/hackathons/${id}`, { replace: true });
          return;
        }
        setHackathon(h);
      })
      .catch(() => navigate(`/hackathons/${id}`, { replace: true }))
      .finally(() => setLoadingHackathon(false));
  }, [token, id, navigate]);

  useEffect(() => {
    if (!token || !id || !hackathon?.isRegistered || !isParticipant) return;
    getMyTeam(token, id)
      .then((t) => {
        setMyTeam(t);
        setActiveTab(t ? "my-team" : "create");
      })
      .catch(() => setMyTeam(null));
  }, [token, id, hackathon?.isRegistered, isParticipant]);

  // Fetch pending join requests (leader) or invites (teamless participant)
  useEffect(() => {
    if (!token || !isParticipant || myTeam === undefined) return;
    if (myTeam) {
      getTeamRequests(token, myTeam.id)
        .then(setPendingRequests)
        .catch(() => {});
    } else {
      getMyInvites(token)
        .then(setPendingInvites)
        .catch(() => {});
    }
  }, [token, isParticipant, myTeam]);

  useEffect(() => {
    if (membersSearchRef.current) clearTimeout(membersSearchRef.current);
    membersSearchRef.current = setTimeout(() => setDebouncedMembersSearch(membersSearch), 350);
    return () => {
      if (membersSearchRef.current) clearTimeout(membersSearchRef.current);
    };
  }, [membersSearch]);

  useEffect(() => {
    setCurrentMembersPage(1);
  }, [debouncedMembersSearch, filterPositions, filterSkills, filterMinExp]);

  const fetchMembers = useCallback(() => {
    if (!token || !myTeam) return;
    setLoadingMembers(true);
    findMembers(token, myTeam.id, {
      name: debouncedMembersSearch || undefined,
      positions: filterPositions.length > 0 ? filterPositions : undefined,
      skills: filterSkills.length > 0 ? filterSkills : undefined,
      minExperience: filterMinExp,
      page: currentMembersPage,
      limit: 10,
    })
      .then(setMembersData)
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [
    token,
    myTeam,
    debouncedMembersSearch,
    filterPositions,
    filterSkills,
    filterMinExp,
    currentMembersPage,
  ]);

  useEffect(() => {
    if (activeTab === "my-team" && myTeam) fetchMembers();
  }, [activeTab, myTeam, fetchMembers]);

  async function handleOpenTeamChat() {
    if (!token || !myTeam) return;
    try {
      const room = await getOrCreateTeamRoom(token, myTeam.id);
      navigate(`/chat?room=${room.id}`);
    } catch (err) {
      toast(
        "Error",
        err instanceof Error ? err.message : "Could not open team chat",
        "destructive",
      );
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !id || !teamName.trim()) return;
    setCreatingTeam(true);
    try {
      const team = await createTeam(token, teamName.trim(), id);
      setMyTeam(team);
      setActiveTab("my-team");
      toast("Team created!", `"${team.name}" is ready`, "success");
    } catch (err) {
      toast(
        "Failed to create team",
        err instanceof Error ? err.message : "Unknown error",
        "destructive",
      );
    } finally {
      setCreatingTeam(false);
    }
  }

  async function handleDeleteTeam() {
    if (!token || !myTeam) return;
    if (!window.confirm(t("teamManagement.confirmDelete"))) return;
    try {
      await deleteTeam(token, myTeam.id);
      setMyTeam(null);
      setActiveTab("create");
      toast(t("teamManagement.teamDeleted"), "", "success");
    } catch (err) {
      toast("Error", err instanceof Error ? err.message : "Could not delete team", "destructive");
    }
  }

  async function handleKickMember(member: TeamMemberDto) {
    if (!token || !myTeam) return;
    if (
      !window.confirm(
        t("teamManagement.confirmKick", { name: `${member.firstName} ${member.lastName}` }),
      )
    )
      return;
    try {
      const updated = await kickMember(token, myTeam.id, member.id);
      setMyTeam(updated);
      toast(t("teamManagement.kicked"), `${member.firstName} ${member.lastName}`, "success");
    } catch (err) {
      toast("Error", err instanceof Error ? err.message : "Could not kick member", "destructive");
    }
  }

  function handleInviteMember(member: TeamMemberDto) {
    const socket = getSocket();
    if (!socket || !myTeam) return;
    socket.emit(
      "team:invite",
      { teamId: myTeam.id, participantId: member.id },
      (err: string | null) => {
        if (err) toast("Invite failed", err, "destructive");
        else
          toast("Invite sent", `Invite sent to ${member.firstName} ${member.lastName}`, "success");
      },
    );
  }

  function handleRespondJoinRequest(requestId: string, accept: boolean) {
    const socket = getSocket();
    if (!socket) return;
    setRespondingId(requestId);
    socket.emit("team:request-join:respond", { requestId, accept }, (err: string | null) => {
      setRespondingId(null);
      if (err) {
        toast(t("teamManagement.requestRespondFailed"), err, "destructive");
      } else {
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
        if (accept) {
          // Refresh team to reflect new member
          if (token && id) {
            getMyTeam(token, id)
              .then((t) => {
                if (t) setMyTeam(t);
              })
              .catch(() => {});
          }
          toast(t("teamManagement.requestAccepted"), "", "success");
        } else {
          toast(t("teamManagement.requestRejected"), "", "success");
        }
      }
    });
  }

  function handleRespondInvite(requestId: string, accept: boolean) {
    const socket = getSocket();
    if (!socket) return;
    setRespondingId(requestId);
    socket.emit("team:invite:respond", { requestId, accept }, (err: string | null) => {
      setRespondingId(null);
      if (err) {
        toast(t("teamManagement.inviteRespondFailed"), err, "destructive");
      } else {
        setPendingInvites((prev) => prev.filter((r) => r.id !== requestId));
        if (accept) {
          // Re-fetch team membership since we just joined
          if (token && id) {
            getMyTeam(token, id)
              .then((t) => {
                setMyTeam(t);
                if (t) setActiveTab("my-team");
              })
              .catch(() => {});
          }
          toast(t("teamManagement.inviteAccepted"), "", "success");
        } else {
          toast(t("teamManagement.inviteRejected"), "", "success");
        }
      }
    });
  }

  if (loadingHackathon || myTeam === undefined) {
    return <div className={styles.state}>{t("common.loading")}</div>;
  }

  if (!hackathon) return null;

  const isLeader = !!myTeam && !!user && myTeam.leaderId === user.participant?.id;
  const canInvite = isLeader && myTeam.members.length < hackathon.maxTeamSize;
  const membersTotalPages = membersData ? Math.max(1, Math.ceil(membersData.total / 10)) : 1;

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate(`/hackathons/${id}`)}
      >
        <ChevronLeft size={16} /> {t("teamManagement.back")}
      </button>

      <h1 className={styles.pageTitle}>{t("teamManagement.title")}</h1>
      <p className={styles.pageSubtitle}>{hackathon.title}</p>

      <div className={styles.tabs}>
        {myTeam && (
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "my-team" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("my-team")}
          >
            {t("teamManagement.myTeam")}
          </button>
        )}
        {!myTeam && (
          <button
            type="button"
            className={`${styles.tab} ${activeTab === "create" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("create")}
          >
            {t("teamManagement.createTeam")}
          </button>
        )}
      </div>

      {activeTab === "my-team" && myTeam && (
        <div className={styles.myTeam}>
          <div className={styles.myTeamHeader}>
            <span className={styles.myTeamName}>{myTeam.name}</span>
            <span className={styles.myTeamSize}>
              {t("teamManagement.members", {
                count: myTeam.members.length,
                max: hackathon.maxTeamSize,
              })}
            </span>
            <Button variant="outline" size="sm" onClick={handleOpenTeamChat}>
              <MessageSquare size={14} /> {t("teamManagement.teamChat")}
            </Button>
            {isLeader && (
              <Button variant="destructive" size="sm" onClick={handleDeleteTeam}>
                <Trash2 size={14} /> {t("teamManagement.deleteTeam")}
              </Button>
            )}
          </div>
          <div className={styles.memberList}>
            {myTeam.members.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                isLeader={myTeam.leaderId === m.id}
                action={
                  isLeader && myTeam.leaderId !== m.id ? (
                    <Button size="sm" variant="destructive" onClick={() => handleKickMember(m)}>
                      <UserMinus size={13} /> {t("teamManagement.kick")}
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </div>

          {isLeader && pendingRequests.length > 0 && (
            <div className={styles.requestsSection}>
              <h3 className={styles.subTitle}>
                <UserPlus size={16} /> {t("teamManagement.pendingRequests")}
                <span className={styles.requestsBadge}>{pendingRequests.length}</span>
              </h3>
              <div className={styles.memberList}>
                {pendingRequests.map((req) => (
                  <MemberCard
                    key={req.id}
                    member={req.participant}
                    action={
                      <div className={styles.requestActions}>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={respondingId === req.id}
                          onClick={() => handleRespondJoinRequest(req.id, true)}
                        >
                          <Check size={13} /> {t("teamManagement.accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={respondingId === req.id}
                          onClick={() => handleRespondJoinRequest(req.id, false)}
                        >
                          <X size={13} /> {t("teamManagement.reject")}
                        </Button>
                      </div>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {canInvite && (
            <div className={styles.inviteSection}>
              <h3 className={styles.subTitle}>
                <UserPlus size={16} /> {t("teamManagement.inviteParticipants")}
              </h3>
              <Input
                placeholder={t("teamManagement.searchByName")}
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                inputSize="sm"
              />
              <TeamFilterBar
                positions={filterPositions}
                skills={filterSkills}
                minExperience={filterMinExp}
                onPositionsChange={setFilterPositions}
                onSkillsChange={setFilterSkills}
                onMinExperienceChange={setFilterMinExp}
              />
              {loadingMembers && (
                <p className={styles.stateSmall}>{t("teamManagement.searching")}</p>
              )}
              {!loadingMembers && membersData && (
                <div className={styles.memberList}>
                  {membersData.members.length === 0 && (
                    <p className={styles.stateSmall}>{t("teamManagement.noParticipants")}</p>
                  )}
                  {membersData.members.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      action={
                        <Button size="sm" variant="outline" onClick={() => handleInviteMember(m)}>
                          {t("teamManagement.invite")}
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}
              <div className={styles.pagination}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentMembersPage <= 1}
                  onClick={() => setCurrentMembersPage((p) => p - 1)}
                >
                  {t("teamSearch.prev")}
                </Button>
                <span className={styles.pageInfo}>
                  {currentMembersPage} / {membersTotalPages}
                  <span className={styles.totalCount}>
                    {t("teamSearch.total", { count: membersData?.total ?? 0 })}
                  </span>
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentMembersPage >= membersTotalPages}
                  onClick={() => setCurrentMembersPage((p) => p + 1)}
                >
                  {t("teamSearch.next")}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "create" && !myTeam && (
        <>
          <form onSubmit={handleCreateTeam} className={styles.createForm}>
            <p className={styles.createHint}>{t("teamManagement.createHint")}</p>
            <div className={styles.createRow}>
              <Input
                placeholder={t("teamManagement.teamNamePlaceholder")}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
              <Button type="submit" disabled={creatingTeam || !teamName.trim()}>
                {creatingTeam ? t("teamManagement.creating") : t("teamManagement.create")}
              </Button>
            </div>
          </form>

          <div className={styles.divider} />

          {pendingInvites.length > 0 && (
            <>
              <div className={styles.invitesSection}>
                <h3 className={styles.subTitle}>
                  <UserPlus size={16} /> {t("teamManagement.pendingInvites")}
                  <span className={styles.requestsBadge}>{pendingInvites.length}</span>
                </h3>
                <div className={styles.memberList}>
                  {pendingInvites.map((inv) => (
                    <div key={inv.id} className={styles.inviteRow}>
                      <Link
                        to={`/hackathons/${inv.hackathonId}/team/search?name=${encodeURIComponent(inv.teamName)}`}
                        className={styles.inviteTeamName}
                      >
                        {inv.teamName}
                      </Link>
                      <div className={styles.requestActions}>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={respondingId === inv.id}
                          onClick={() => handleRespondInvite(inv.id, true)}
                        >
                          <Check size={13} /> {t("teamManagement.accept")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={respondingId === inv.id}
                          onClick={() => handleRespondInvite(inv.id, false)}
                        >
                          <X size={13} /> {t("teamManagement.reject")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.divider} />
            </>
          )}

          <div className={styles.searchPrompt}>
            <p className={styles.searchPromptText}>{t("teamManagement.orFindTeam")}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/hackathons/${id}/team/search`)}
            >
              <Search size={15} /> {t("teamManagement.browseTeams")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
