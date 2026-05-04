import { ChevronLeft, Search, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getHackathon, type HackathonDto } from '../api/hackathons';
import {
    createTeam,
    findMembers,
    getMyTeam,
    type MembersPage,
    type TeamDto,
    type TeamMemberDto,
} from '../api/teams';
import { MemberCard } from '../components/team/MemberCard';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationsContext';
import { getSocket } from '../services/socketService';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import styles from './TeamManagementPage.module.css';

type TeamTab = 'my-team' | 'create';

export function TeamManagementPage() {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useAuth();
  const { toast } = useNotifications();
  const navigate = useNavigate();

  const [hackathon, setHackathon] = useState<HackathonDto | null>(null);
  const [loadingHackathon, setLoadingHackathon] = useState(true);

  const [myTeam, setMyTeam] = useState<TeamDto | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<TeamTab>('create');

  const [teamName, setTeamName] = useState('');
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [membersPage, setMembersPage] = useState<MembersPage | null>(null);
  const [membersSearch, setMembersSearch] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const membersSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedMembersSearch, setDebouncedMembersSearch] = useState('');

  const isParticipant = user?.role === 'participant';

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
        setActiveTab(t ? 'my-team' : 'create');
      })
      .catch(() => setMyTeam(null));
  }, [token, id, hackathon?.isRegistered, isParticipant]);

  useEffect(() => {
    if (membersSearchRef.current) clearTimeout(membersSearchRef.current);
    membersSearchRef.current = setTimeout(() => setDebouncedMembersSearch(membersSearch), 350);
    return () => {
      if (membersSearchRef.current) clearTimeout(membersSearchRef.current);
    };
  }, [membersSearch]);

  const fetchMembers = useCallback(() => {
    if (!token || !myTeam) return;
    setLoadingMembers(true);
    findMembers(token, myTeam.id, { name: debouncedMembersSearch || undefined, limit: 10 })
      .then(setMembersPage)
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, [token, myTeam, debouncedMembersSearch]);

  useEffect(() => {
    if (activeTab === 'my-team' && myTeam) fetchMembers();
  }, [activeTab, myTeam, fetchMembers]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !id || !teamName.trim()) return;
    setCreatingTeam(true);
    try {
      const team = await createTeam(token, teamName.trim(), id);
      setMyTeam(team);
      setActiveTab('my-team');
      toast('Team created!', `"${team.name}" is ready`, 'success');
    } catch (err) {
      toast('Failed to create team', err instanceof Error ? err.message : 'Unknown error', 'destructive');
    } finally {
      setCreatingTeam(false);
    }
  }

  function handleInviteMember(member: TeamMemberDto) {
    const socket = getSocket();
    if (!socket || !myTeam) return;
    socket.emit('team:invite', { teamId: myTeam.id, participantId: member.id }, (err: string | null) => {
      if (err) toast('Invite failed', err, 'destructive');
      else toast('Invite sent', `Invite sent to ${member.firstName} ${member.lastName}`, 'success');
    });
  }

  if (loadingHackathon || myTeam === undefined) {
    return <div className={styles.state}>Loading…</div>;
  }

  if (!hackathon) return null;

  const canInvite = !!myTeam && !!user && myTeam.members.length < hackathon.maxTeamSize;

  return (
    <div className={styles.page}>
      <button
        type="button"
        className={styles.backBtn}
        onClick={() => navigate(`/hackathons/${id}`)}
      >
        <ChevronLeft size={16} /> Back to hackathon
      </button>

      <h1 className={styles.pageTitle}>Team Management</h1>
      <p className={styles.pageSubtitle}>{hackathon.title}</p>

      <div className={styles.tabs}>
        {myTeam && (
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'my-team' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('my-team')}
          >
            My Team
          </button>
        )}
        {!myTeam && (
          <button
            type="button"
            className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('create')}
          >
            Create Team
          </button>
        )}
      </div>

      {activeTab === 'my-team' && myTeam && (
        <div className={styles.myTeam}>
          <div className={styles.myTeamHeader}>
            <span className={styles.myTeamName}>{myTeam.name}</span>
            <span className={styles.myTeamSize}>
              {myTeam.members.length} / {hackathon.maxTeamSize} members
            </span>
          </div>
          <div className={styles.memberList}>
            {myTeam.members.map((m) => (
              <MemberCard key={m.id} member={m} isLeader={myTeam.leaderId === m.id} />
            ))}
          </div>

          {canInvite && (
            <div className={styles.inviteSection}>
              <h3 className={styles.subTitle}>
                <UserPlus size={16} /> Invite participants
              </h3>
              <Input
                placeholder="Search by name…"
                value={membersSearch}
                onChange={(e) => setMembersSearch(e.target.value)}
                inputSize="sm"
              />
              {loadingMembers && <p className={styles.stateSmall}>Searching…</p>}
              {!loadingMembers && membersPage && (
                <div className={styles.memberList}>
                  {membersPage.members.length === 0 && (
                    <p className={styles.stateSmall}>No available participants found</p>
                  )}
                  {membersPage.members.map((m) => (
                    <MemberCard
                      key={m.id}
                      member={m}
                      action={
                        <Button size="sm" variant="outline" onClick={() => handleInviteMember(m)}>
                          Invite
                        </Button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'create' && !myTeam && (
        <>
          <form onSubmit={handleCreateTeam} className={styles.createForm}>
            <p className={styles.createHint}>Give your team a name to get started.</p>
            <div className={styles.createRow}>
              <Input
                placeholder="Team name…"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
              <Button type="submit" disabled={creatingTeam || !teamName.trim()}>
                {creatingTeam ? 'Creating…' : 'Create'}
              </Button>
            </div>
          </form>

          <div className={styles.divider} />

          <div className={styles.searchPrompt}>
            <p className={styles.searchPromptText}>Or find an existing team to join</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/hackathons/${id}/team/search`)}
            >
              <Search size={15} /> Browse teams
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
