import { Calendar, CheckCircle, Clock, Code2, Ticket, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { HackathonDto } from "../../api/hackathons";
import { formatDateShort } from "../../shared/formatDate";
import styles from "./HackathonCard.module.css";

export function HackathonCard({ hackathon: h }: { hackathon: HackathonDto }) {
  const { t, i18n } = useTranslation();
  return (
    <Link to={`/hackathons/${h.id}`} className={styles.cardLink}>
      <article className={styles.card}>
        {h.imageUrl ? (
          <img src={h.imageUrl} alt={h.title} className={styles.cardImage} />
        ) : (
          <div className={styles.cardImagePlaceholder} aria-hidden="true">
            <Code2 size={40} />
          </div>
        )}
        <div className={styles.cardBody}>
          <span className={styles.cardTopic}>{h.topic}</span>
          <h3 className={styles.cardTitle}>{h.title}</h3>
          <p className={styles.cardDescription}>{h.description}</p>
          <div className={styles.cardMeta}>
            <span className={styles.cardMetaItem}>
              <Calendar size={13} /> {formatDateShort(h.startDate, i18n.language)}
            </span>
            <span className={styles.cardMetaItem}>
              <Clock size={13} /> {h.durationHours}h
            </span>
            <span className={styles.cardMetaItem}>
              <Users size={13} /> {t("hackathonCard.maxTeamSize", { count: h.maxTeamSize })}
            </span>
            {h.maxParticipants != null && (
              <span className={styles.cardMetaItem}>
                <Ticket size={13} /> {h.participantCount}/{h.maxParticipants}
                {h.registrationFull && ` ${t("hackathonCard.full")}`}
              </span>
            )}
            {h.isRegistered && (
              <span className={styles.cardRegistered}>
                <CheckCircle size={13} /> {t("hackathonCard.registered")}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
