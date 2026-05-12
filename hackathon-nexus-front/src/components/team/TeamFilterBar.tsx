import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../shared/ui/Input";
import styles from "./TeamFilterBar.module.css";

const ALL_POSITIONS = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Machine Learning Engineer",
  "Data Scientist",
  "Mobile Developer",
  "DevOps Engineer",
  "Security Engineer",
  "Blockchain Developer",
  "Game Developer",
  "Embedded / IoT Engineer",
  "UI/UX Designer",
  "AR/VR Developer",
  "Product Manager",
  "QA Engineer",
];

const ALL_SKILLS = [
  "Python","JavaScript","TypeScript","Java","C++","Go","Swift","Kotlin","Rust","C#","Ruby","PHP","Scala","R",
  "React","Vue.js","Angular","Svelte","Next.js","Tailwind CSS",
  "Node.js","Django","FastAPI","Spring Boot","Express.js","Flask","GraphQL","REST API Design","gRPC",
  "PostgreSQL","MySQL","MongoDB","Redis","Elasticsearch","Cassandra","SQLite","Neo4j",
  "Docker","Kubernetes","AWS","GCP","Azure","Linux","Git","Terraform","CI/CD","Ansible",
  "TensorFlow","PyTorch","scikit-learn","NLP","LLM Fine-tuning","Computer Vision","Pandas","NumPy","Spark","Kafka","Data Visualization","Feature Engineering",
  "React Native","Flutter","SwiftUI","Jetpack Compose",
  "Solidity","Web3.js","Hardhat",
  "Arduino","Embedded C","FPGA","RTOS",
  "Unity","Unreal Engine","WebGL",
  "Figma","UI/UX Design","Prototyping","User Research",
  "Penetration Testing","Cryptography","OAuth/OIDC",
  "Unit Testing","Agile / Scrum","System Design","Technical Writing","Monitoring / Observability",
];

export interface TeamFilterBarProps {
  positions: string[];
  skills: string[];
  minExperience: number | undefined;
  onPositionsChange: (positions: string[]) => void;
  onSkillsChange: (skills: string[]) => void;
  onMinExperienceChange: (value: number | undefined) => void;
}

export function TeamFilterBar({
  positions,
  skills,
  minExperience,
  onPositionsChange,
  onSkillsChange,
  onMinExperienceChange,
}: TeamFilterBarProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [skillSearch, setSkillSearch] = useState("");

  const activeCount = positions.length + skills.length + (minExperience !== undefined ? 1 : 0);

  function togglePosition(pos: string) {
    onPositionsChange(
      positions.includes(pos) ? positions.filter((p) => p !== pos) : [...positions, pos],
    );
  }

  function toggleSkill(skill: string) {
    onSkillsChange(
      skills.includes(skill) ? skills.filter((s) => s !== skill) : [...skills, skill],
    );
  }

  function clearAll() {
    onPositionsChange([]);
    onSkillsChange([]);
    onMinExperienceChange(undefined);
    setSkillSearch("");
  }

  const filteredSkills = ALL_SKILLS.filter((s) =>
    s.toLowerCase().includes(skillSearch.toLowerCase()),
  );

  return (
    <div className={styles.root}>
      <div className={styles.toggleRow}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${open ? styles.toggleBtnActive : ""}`}
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal size={14} />
          {t("filters.toggle")}
          {activeCount > 0 && <span className={styles.badge}>{activeCount}</span>}
        </button>
        {activeCount > 0 && (
          <button type="button" className={styles.clearBtn} onClick={clearAll}>
            <X size={12} /> {t("filters.clearAll")}
          </button>
        )}
      </div>

      {open && (
        <div className={styles.panel}>
          {/* Positions */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>{t("filters.positions")}</span>
            <div className={styles.chipGrid}>
              {ALL_POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`${styles.chip} ${positions.includes(pos) ? styles.chipActive : ""}`}
                  onClick={() => togglePosition(pos)}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Min Experience */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>{t("filters.minExperience")}</span>
            <Input
              type="number"
              inputSize="sm"
              placeholder={t("filters.minExperiencePlaceholder")}
              value={minExperience ?? ""}
              min={1}
              max={30}
              onChange={(e) => {
                const val = e.target.value;
                onMinExperienceChange(val === "" ? undefined : Math.max(1, parseInt(val, 10)));
              }}
              className={styles.expInput}
            />
          </div>

          {/* Skills */}
          <div className={styles.section}>
            <span className={styles.sectionLabel}>{t("filters.skills")}</span>
            <Input
              inputSize="sm"
              placeholder={t("filters.skillsSearchPlaceholder")}
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className={styles.skillSearch}
            />
            <div className={styles.chipGrid}>
              {filteredSkills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className={`${styles.chip} ${skills.includes(skill) ? styles.chipActive : ""}`}
                  onClick={() => toggleSkill(skill)}
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
