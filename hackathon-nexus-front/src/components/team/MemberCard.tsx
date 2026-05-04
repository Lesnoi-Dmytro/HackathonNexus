import { Crown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TeamMemberDto } from '../../api/teams';
import styles from './MemberCard.module.css';

export function MemberCard({
  member,
  isLeader = false,
  action,
}: {
  member: TeamMemberDto;
  isLeader?: boolean;
  action?: ReactNode;
}) {
  return (
    <div className={styles.memberCard}>
      <div className={styles.memberAvatar}>
        {member.firstName[0]}{member.lastName[0]}
      </div>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>
          {member.firstName} {member.lastName}
          {isLeader && (
            <span className={styles.leaderBadge}>
              <Crown size={10} /> Leader
            </span>
          )}
        </span>
        {member.position && <span className={styles.memberPosition}>{member.position}</span>}
        {member.skills.length > 0 && (
          <div className={styles.memberSkills}>
            {member.skills.slice(0, 4).map((s) => (
              <span key={s} className={styles.skillChip}>{s}</span>
            ))}
            {member.skills.length > 4 && (
              <span className={styles.skillChip}>+{member.skills.length - 4}</span>
            )}
          </div>
        )}
      </div>
      {action && <div className={styles.memberAction}>{action}</div>}
    </div>
  );
}
