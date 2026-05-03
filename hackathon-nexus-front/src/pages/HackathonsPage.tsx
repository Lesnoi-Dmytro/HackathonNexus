import { useEffect, useState } from 'react';
import { ALL_TOPICS, listHackathons, type HackathonDto, type HackathonTopic } from '../api/hackathons';
import { useAuth } from '../contexts/AuthContext';
import styles from './HackathonsPage.module.css';

const TOPIC_EMOJI: Record<HackathonTopic, string> = {
  'AI / Machine Learning': '🤖',
  'AR / VR': '🥽',
  'Blockchain / Web3': '⛓️',
  'Cybersecurity': '🔒',
  'FinTech': '💳',
  'Game Development': '🎮',
  'HealthTech': '🏥',
  'IoT & Embedded': '📡',
  'Mobile Development': '📱',
  'Web Development': '🌐',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function HackathonsPage() {
  const { token } = useAuth();

  const [hackathons, setHackathons] = useState<HackathonDto[]>([]);
  const [activeTopic, setActiveTopic] = useState<HackathonTopic | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    setIsLoading(true);
    setError('');

    listHackathons(token, activeTopic)
      .then(setHackathons)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load hackathons');
      })
      .finally(() => setIsLoading(false));
  }, [token, activeTopic]);

  return (
    <div className={styles.page}>
        <h2 className={styles.heading}>Hackathons</h2>

        {/* Topic filter chips */}
        <div className={styles.filters}>
          <button
            type="button"
            className={`${styles.chip} ${activeTopic === undefined ? styles.chipActive : ''}`}
            onClick={() => setActiveTopic(undefined)}
          >
            All
          </button>
          {ALL_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              className={`${styles.chip} ${activeTopic === topic ? styles.chipActive : ''}`}
              onClick={() => setActiveTopic(activeTopic === topic ? undefined : topic)}
            >
              {TOPIC_EMOJI[topic]} {topic}
            </button>
          ))}
        </div>

        {/* States */}
        {isLoading && <p className={styles.loading}>Loading…</p>}
        {!isLoading && error && <p className={styles.error}>{error}</p>}
        {!isLoading && !error && hackathons.length === 0 && (
          <p className={styles.empty}>No hackathons found{activeTopic ? ` for "${activeTopic}"` : ''}.</p>
        )}

        {/* Grid */}
        {!isLoading && !error && hackathons.length > 0 && (
          <div className={styles.grid}>
            {hackathons.map((h) => (
              <article key={h.id} className={styles.card}>
                {h.imageUrl ? (
                  <img src={h.imageUrl} alt={h.title} className={styles.cardImage} />
                ) : (
                  <div className={styles.cardImagePlaceholder} aria-hidden="true">
                    {TOPIC_EMOJI[h.topic]}
                  </div>
                )}
                <div className={styles.cardBody}>
                  <span className={styles.cardTopic}>{h.topic}</span>
                  <h3 className={styles.cardTitle}>{h.title}</h3>
                  <p className={styles.cardDescription}>{h.description}</p>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardMetaItem}>📅 {formatDate(h.startDate)}</span>
                    <span className={styles.cardMetaItem}>⏱ {h.durationHours}h</span>
                    <span className={styles.cardMetaItem}>👥 max {h.maxTeamSize}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
    </div>
  );
}
