import type { TeamDto } from "../../api/teams";
import { Button } from "../../shared/ui/Button";
import { MemberCard } from "./MemberCard";
import styles from "./TeamCard.module.css";

export function TeamCard({
  team,
  maxTeamSize,
  onRequestJoin,
}: {
  team: TeamDto;
  maxTeamSize: number;
  onRequestJoin: () => void;
}) {
  const isFull = team.members.length >= maxTeamSize;
  return (
    <div className={styles.teamCard}>
      <div className={styles.teamCardHeader}>
        <span className={styles.teamCardName}>{team.name}</span>
        <span className={`${styles.teamCardSize} ${isFull ? styles.teamCardFull : ""}`}>
          {team.members.length} / {maxTeamSize}
        </span>
      </div>
      <div className={styles.memberList}>
        {team.members.map((m) => (
          <MemberCard key={m.id} member={m} isLeader={team.leaderId === m.id} />
        ))}
      </div>
      {!isFull && (
        <Button variant="outline" size="sm" onClick={onRequestJoin}>
          Request to join
        </Button>
      )}
    </div>
  );
}
