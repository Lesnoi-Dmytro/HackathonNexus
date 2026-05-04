import { useEffect, useRef, useState } from 'react';
import { ALL_TOPICS, listHackathons, type HackathonTopic, type HackathonsPage } from '../api/hackathons';
import { HackathonCard } from '../components/hackathon/HackathonCard';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import styles from './HackathonsPage.module.css';

const PAGE_SIZE = 12;

export function HackathonsPage() {
  const { token } = useAuth();

  const [result, setResult] = useState<HackathonsPage>({ data: [], total: 0, page: 1, limit: PAGE_SIZE });
  const [activeTopic, setActiveTopic] = useState<HackathonTopic | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [notStarted, setNotStarted] = useState(false);
  const [notEnded, setNotEnded] = useState(false);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Debounce search input
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [search]);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [activeTopic, notStarted, notEnded]);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    setError('');
    listHackathons(token, {
      topic: activeTopic,
      search: debouncedSearch || undefined,
      notStarted: notStarted || undefined,
      notEnded: notEnded || undefined,
      page,
      limit: PAGE_SIZE,
    })
      .then(setResult)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load hackathons');
      })
      .finally(() => setIsLoading(false));
  }, [token, activeTopic, debouncedSearch, notStarted, notEnded, page]);

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Hackathons</h2>

        <div className={styles.toolbarRight}>
          {/* Status toggles */}
          <button
            type="button"
            className={`${styles.toggle} ${notStarted ? styles.toggleActive : ''}`}
            onClick={() => setNotStarted((v) => !v)}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`${styles.toggle} ${notEnded ? styles.toggleActive : ''}`}
            onClick={() => setNotEnded((v) => !v)}
          >
            Ongoing
          </button>

          {/* Search */}
          <div className={styles.searchWrap}>
            <Input
              placeholder="Search hackathons…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              inputSize="sm"
            />
          </div>
        </div>
      </div>

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
            {topic}
          </button>
        ))}
      </div>

      {/* States */}
      {isLoading && <p className={styles.loading}>Loading…</p>}
      {!isLoading && error && <p className={styles.error}>{error}</p>}
      {!isLoading && !error && result.data.length === 0 && (
        <p className={styles.empty}>No hackathons found.</p>
      )}

      {/* Grid */}
      {!isLoading && !error && result.data.length > 0 && (
        <div className={styles.grid}>
          {result.data.map((h) => (
            <HackathonCard key={h.id} hackathon={h} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </Button>
          <span className={styles.pageInfo}>
            {page} / {totalPages}
            <span className={styles.totalCount}>({result.total} total)</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      )}
    </div>
  );
}
