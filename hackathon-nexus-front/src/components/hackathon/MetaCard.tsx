import type { ReactNode } from "react";
import styles from "./MetaCard.module.css";

export function MetaCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={styles.metaCard}>
      <span className={styles.metaIcon}>{icon}</span>
      <div>
        <div className={styles.metaLabel}>{label}</div>
        <div className={styles.metaValue}>{value}</div>
      </div>
    </div>
  );
}
