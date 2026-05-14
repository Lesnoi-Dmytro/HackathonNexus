import {
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  Code2,
  Flag,
  Radio,
  Ticket,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getHackathon,
  registerForHackathon,
  unregisterFromHackathon,
  type HackathonDto,
} from "../api/hackathons";
import { MetaCard } from "../components/hackathon/MetaCard";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { formatDateLong } from "../shared/formatDate";
import { Button } from "../shared/ui/Button";
import styles from "./HackathonDetailPage.module.css";

export function HackathonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const { toast } = useNotifications();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const [hackathon, setHackathon] = useState<HackathonDto | null>(null);
  const [loadingHackathon, setLoadingHackathon] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);

  const isParticipant = user?.role === "participant";

  useEffect(() => {
    if (!id) return;
    setLoadingHackathon(true);
    getHackathon(token, id)
      .then(setHackathon)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("common.back")))
      .finally(() => setLoadingHackathon(false));
  }, [token, id]);

  async function handleRegister() {
    if (!token || !id) return;
    setRegistering(true);
    try {
      const updated = await registerForHackathon(token, id);
      setHackathon(updated);
      toast("Registered!", `You joined "${updated.title}"`, "success");
    } catch (err) {
      toast(
        "Registration failed",
        err instanceof Error ? err.message : "Unknown error",
        "destructive",
      );
    } finally {
      setRegistering(false);
    }
  }

  async function handleUnregister() {
    if (!token || !id || !hackathon) return;
    setRegistering(true);
    try {
      await unregisterFromHackathon(token, id);
      setHackathon((h) =>
        h ? { ...h, isRegistered: false, participantCount: h.participantCount - 1 } : h,
      );
      toast("Unregistered", `You left "${hackathon.title}"`, "default");
    } catch (err) {
      toast("Failed", err instanceof Error ? err.message : "Unknown error", "destructive");
    } finally {
      setRegistering(false);
    }
  }

  if (loadingHackathon) return <div className={styles.state}>{t("common.loading")}</div>;
  if (error || !hackathon) {
    return (
      <div className={styles.state}>
        <p className={styles.stateError}>{error || t("hackathonDetail.notFound")}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/hackathons")}>
          {t("common.back")}
        </Button>
      </div>
    );
  }

  const now = new Date();
  const start = new Date(hackathon.startDate);
  const end = new Date(start.getTime() + hackathon.durationHours * 3_600_000);
  const hasStarted = start <= now;
  const hasEnded = end <= now;
  const canManageTeam = isParticipant && hackathon.isRegistered && !hasStarted;

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backBtn} onClick={() => navigate("/hackathons")}>
        <ChevronLeft size={16} /> {t("hackathonDetail.backToHackathons")}
      </button>

      <div className={styles.hero}>
        {hackathon.imageUrl ? (
          <img src={hackathon.imageUrl} alt={hackathon.title} className={styles.heroImage} />
        ) : (
          <div className={styles.heroImagePlaceholder} aria-hidden="true">
            <Code2 size={48} />
          </div>
        )}
        <div className={styles.heroContent}>
          <span className={styles.topic}>{hackathon.topic}</span>
          <h1 className={styles.title}>{hackathon.title}</h1>
          <p className={styles.description}>{hackathon.description}</p>
        </div>
      </div>

      <div className={styles.metaGrid}>
        <MetaCard
          icon={<Calendar size={18} />}
          label={t("hackathonDetail.starts")}
          value={formatDateLong(hackathon.startDate, i18n.language)}
        />
        <MetaCard
          icon={<Flag size={18} />}
          label={t("hackathonDetail.ends")}
          value={formatDateLong(
            new Date(
              new Date(hackathon.startDate).getTime() + hackathon.durationHours * 3_600_000,
            ).toISOString(),
            i18n.language,
          )}
        />
        <MetaCard
          icon={<Clock size={18} />}
          label={t("hackathonDetail.duration")}
          value={t("hackathonDetail.durationHours", { hours: hackathon.durationHours })}
        />
        <MetaCard
          icon={<Users size={18} />}
          label={t("hackathonDetail.maxTeamSize")}
          value={String(hackathon.maxTeamSize)}
        />
        {hackathon.maxParticipants != null && (
          <MetaCard
            icon={<Ticket size={18} />}
            label={t("hackathonDetail.participants")}
            value={`${hackathon.participantCount} / ${hackathon.maxParticipants}`}
          />
        )}
        {hackathon.maxParticipants == null && hackathon.participantCount > 0 && (
          <MetaCard
            icon={<Ticket size={18} />}
            label={t("hackathonDetail.participants")}
            value={String(hackathon.participantCount)}
          />
        )}
      </div>

      {hasEnded && (
        <div className={`${styles.banner} ${styles.bannerEnded}`}>{t("hackathonDetail.ended")}</div>
      )}
      {!hasEnded && hasStarted && (
        <div className={`${styles.banner} ${styles.bannerOngoing}`}>
          <Radio size={14} /> {t("hackathonDetail.liveNow")}
        </div>
      )}

      {!hasEnded && isParticipant && (
        <div className={styles.registrationBox}>
          {hackathon.isRegistered ? (
            <div className={styles.registeredRow}>
              <span className={styles.registeredBadge}>
                <CheckCircle size={14} /> {t("hackathonDetail.registered")}
              </span>
              {!hasStarted && (
                <Button variant="ghost" size="sm" onClick={handleUnregister} disabled={registering}>
                  {registering ? t("hackathonDetail.processing") : t("hackathonDetail.unregister")}
                </Button>
              )}
            </div>
          ) : hackathon.registrationFull ? (
            <span className={styles.fullBadge}>{t("hackathonDetail.registrationFull")}</span>
          ) : (
            <Button onClick={handleRegister} disabled={registering}>
              {registering ? t("hackathonDetail.registering") : t("hackathonDetail.registerBtn")}
            </Button>
          )}
        </div>
      )}

      {canManageTeam && (
        <div className={styles.teamBox}>
          <div className={styles.teamBoxInfo}>
            <p className={styles.teamBoxTitle}>{t("hackathonDetail.teamTitle")}</p>
            <p className={styles.teamBoxDesc}>{t("hackathonDetail.teamDesc")}</p>
          </div>
          <Link to={`/hackathons/${id}/team`}>
            <Button variant="outline">{t("hackathonDetail.manageTeam")}</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
