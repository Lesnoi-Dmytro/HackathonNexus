import { Calendar, CheckCircle, Clock, Code2, Ticket, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { HackathonDto } from "../../api/hackathons";
import styles from "./HackathonCard.module.css";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function HackathonCard({ hackathon: h }: { hackathon: HackathonDto }) {
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
              <Calendar size={13} /> {formatDate(h.startDate)}
            </span>
            <span className={styles.cardMetaItem}>
              <Clock size={13} /> {h.durationHours}h
            </span>
            <span className={styles.cardMetaItem}>
              <Users size={13} /> max {h.maxTeamSize}
            </span>
            {h.maxParticipants != null && (
              <span className={styles.cardMetaItem}>
                <Ticket size={13} /> {h.participantCount}/{h.maxParticipants}
                {h.registrationFull && " · Full"}
              </span>
            )}
            {h.isRegistered && (
              <span className={styles.cardRegistered}>
                <CheckCircle size={13} /> Registered
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
