import { ChevronLeft } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { getHackathon, type HackathonDto } from "../api/hackathons";
import { findTeams, type TeamsPage } from "../api/teams";
import { TeamCard } from "../components/team/TeamCard";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { getSocket } from "../services/socketService";
import { Input } from "../shared/ui/Input";
import styles from "./TeamSearchPage.module.css";

export function TeamSearchPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { toast } = useNotifications();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [hackathon, setHackathon] = useState<HackathonDto | null>(null);
  const [loadingHackathon, setLoadingHackathon] = useState(true);

  const [teamsPage, setTeamsPage] = useState<TeamsPage | null>(null);
  const [teamsSearch, setTeamsSearch] = useState("");
  const [loadingTeams, setLoadingTeams] = useState(false);
  const teamsSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedTeamsSearch, setDebouncedTeamsSearch] = useState("");

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
    if (teamsSearchRef.current) clearTimeout(teamsSearchRef.current);
    teamsSearchRef.current = setTimeout(() => setDebouncedTeamsSearch(teamsSearch), 350);
    return () => {
      if (teamsSearchRef.current) clearTimeout(teamsSearchRef.current);
    };
  }, [teamsSearch]);

  const fetchTeams = useCallback(() => {
    if (!token || !id) return;
    setLoadingTeams(true);
    findTeams(token, { hackathonId: id, name: debouncedTeamsSearch || undefined, limit: 10 })
      .then(setTeamsPage)
      .catch(() => {})
      .finally(() => setLoadingTeams(false));
  }, [token, id, debouncedTeamsSearch]);

  useEffect(() => {
    if (hackathon) fetchTeams();
  }, [hackathon, fetchTeams]);

  function handleRequestJoin(teamId: string, teamName: string) {
    const socket = getSocket();
    if (!socket) {
      toast("Not connected", "WebSocket not connected", "destructive");
      return;
    }
    socket.emit("team:request-join", { teamId }, (err: string | null) => {
      if (err) toast("Request failed", err, "destructive");
      else toast("Request sent", `Join request sent to team "${teamName}"`, "success");
    });
  }

  if (loadingHackathon) {
    return <div className={styles.state}>{t("common.loading")}</div>;
  }

  if (!hackathon) return null;

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate(`/hackathons/${id}/team`)}
      >
        <ChevronLeft size={16} /> {t("teamSearch.back")}
      </button>

      <h1 className={styles.pageTitle}>{t("teamSearch.title")}</h1>
      <p className={styles.pageSubtitle}>{hackathon.title}</p>

      <div className={styles.searchWrap}>
        <Input
          placeholder={t("teamSearch.searchPlaceholder")}
          value={teamsSearch}
          onChange={(e) => setTeamsSearch(e.target.value)}
          inputSize="sm"
        />
      </div>

      {loadingTeams && <p className={styles.stateSmall}>{t("teamSearch.loadingTeams")}</p>}
      {!loadingTeams && teamsPage && teamsPage.teams.length === 0 && (
        <p className={styles.stateSmall}>{t("teamSearch.noTeams")}</p>
      )}
      {!loadingTeams &&
        teamsPage &&
        teamsPage.teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            maxTeamSize={hackathon.maxTeamSize}
            onRequestJoin={() => handleRequestJoin(team.id, team.name)}
          />
        ))}
    </div>
  );
}
