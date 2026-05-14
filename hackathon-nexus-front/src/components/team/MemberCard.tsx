import { Crown } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { TeamMemberDto } from "../../api/teams";
import styles from "./MemberCard.module.css";

function SkillsList({ skills }: { skills: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? skills : skills.slice(0, 4);
  const overflow = skills.length - 4;

  return (
    <div className={styles.memberSkills}>
      {visible.map((s) => (
        <span key={s} className={styles.skillChip}>
          {s}
        </span>
      ))}
      {overflow > 0 && !showAll && (
        <button type="button" className={styles.skillChipToggle} onClick={() => setShowAll(true)}>
          +{overflow}
        </button>
      )}
      {showAll && overflow > 0 && (
        <button type="button" className={styles.skillChipToggle} onClick={() => setShowAll(false)}>
          &minus;
        </button>
      )}
    </div>
  );
}

export function MemberCard({
  member,
  isLeader = false,
  action,
}: {
  member: TeamMemberDto;
  isLeader?: boolean;
  action?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.memberCard}>
      <div className={styles.memberAvatar}>
        {member.firstName[0]}
        {member.lastName[0]}
      </div>
      <div className={styles.memberInfo}>
        <span className={styles.memberName}>
          <Link to={`/users/${member.userId}`} className={styles.memberNameLink}>
            {member.firstName} {member.lastName}
          </Link>
          {isLeader && (
            <span className={styles.leaderBadge}>
              <Crown size={10} /> {t("memberCard.leader")}
            </span>
          )}
        </span>
        {member.position && <span className={styles.memberPosition}>{member.position}</span>}
        {member.skills.length > 0 && <SkillsList skills={member.skills} />}
      </div>
      {action && <div className={styles.memberAction}>{action}</div>}
    </div>
  );
}
