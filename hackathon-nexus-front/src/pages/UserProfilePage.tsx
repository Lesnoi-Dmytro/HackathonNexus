import { Briefcase, ChevronLeft, MessageSquare, Pencil, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getUserById, updateParticipantProfile, type UserDto } from "../api/auth";
import { getOrCreateDirectRoom } from "../api/chat";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { Button } from "../shared/ui/Button";
import styles from "./UserProfilePage.module.css";

const ALL_POSITIONS = [
  "Backend Developer",
  "Frontend Developer",
  "Full Stack Developer",
  "Machine Learning Engineer",
  "Data Scientist",
  "Mobile Developer",
  "DevOps Engineer",
  "Security Engineer",
  "Game Developer",
  "Blockchain Developer",
  "Embedded Systems Developer",
  "UI/UX Designer",
  "Product Manager",
  "QA Engineer",
];

const ALL_SKILLS = [
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "Go",
  "Swift",
  "Kotlin",
  "Rust",
  "C#",
  "Ruby",
  "PHP",
  "Scala",
  "R",
  "React",
  "Vue.js",
  "Angular",
  "Svelte",
  "Next.js",
  "Tailwind CSS",
  "Node.js",
  "Django",
  "FastAPI",
  "Spring Boot",
  "Express.js",
  "Flask",
  "GraphQL",
  "REST API Design",
  "gRPC",
  "PostgreSQL",
  "MySQL",
  "MongoDB",
  "Redis",
  "Elasticsearch",
  "Cassandra",
  "SQLite",
  "Neo4j",
  "Docker",
  "Kubernetes",
  "AWS",
  "GCP",
  "Azure",
  "Linux",
  "Git",
  "Terraform",
  "CI/CD",
  "Ansible",
  "TensorFlow",
  "PyTorch",
  "scikit-learn",
  "NLP",
  "LLM Fine-tuning",
  "Computer Vision",
  "Pandas",
  "NumPy",
  "Spark",
  "Kafka",
  "Data Visualization",
  "Feature Engineering",
  "React Native",
  "Flutter",
  "SwiftUI",
  "Jetpack Compose",
  "Solidity",
  "Web3.js",
  "Hardhat",
  "Arduino",
  "Embedded C",
  "FPGA",
  "RTOS",
  "Unity",
  "Unreal Engine",
  "WebGL",
  "Figma",
  "UI/UX Design",
  "Prototyping",
  "User Research",
  "Penetration Testing",
  "Cryptography",
  "OAuth/OIDC",
  "Unit Testing",
  "Agile / Scrum",
  "System Design",
  "Technical Writing",
  "Monitoring / Observability",
];

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { token, user: currentUser, setAuth } = useAuth();
  const { toast } = useNotifications();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [searchParams, setSearchParams] = useSearchParams();

  const [profile, setProfile] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startingChat, setStartingChat] = useState(false);

  const [editing, setEditing] = useState(() => searchParams.get("edit") === "1");
  const [saving, setSaving] = useState(false);
  const [editPosition, setEditPosition] = useState("");
  const [editYears, setEditYears] = useState<string>("");
  const [editExperience, setEditExperience] = useState("");
  const [editSkills, setEditSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");

  const isOwnProfile = currentUser && String(currentUser.id) === id;
  const canEdit = isOwnProfile && currentUser?.role === "participant";

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    setError("");
    getUserById(token, id)
      .then((u) => {
        setProfile(u);
        if (searchParams.get("edit") === "1") {
          const p = u.participant;
          setEditPosition(p?.position ?? "");
          setEditYears(p?.yearsOfExperience != null ? String(p.yearsOfExperience) : "");
          setEditExperience(p?.experience ?? "");
          setEditSkills(p?.skills ?? []);
        }
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("common.error")))
      .finally(() => setLoading(false));
  }, [token, id, t]);

  function openEdit() {
    const p = profile?.participant;
    setEditPosition(p?.position ?? "");
    setEditYears(p?.yearsOfExperience != null ? String(p.yearsOfExperience) : "");
    setEditExperience(p?.experience ?? "");
    setEditSkills(p?.skills ?? []);
    setSkillSearch("");
    setSearchParams({ edit: "1" }, { replace: true });
    setEditing(true);
  }

  function closeEdit() {
    setSearchParams({}, { replace: true });
    setEditing(false);
  }

  function toggleSkill(skill: string) {
    setEditSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      const years = editYears !== "" ? parseInt(editYears, 10) : undefined;
      const updated = await updateParticipantProfile(token, {
        position: editPosition || undefined,
        yearsOfExperience: years,
        experience: editExperience || undefined,
        skills: editSkills,
      });
      setProfile(updated);
      setAuth(token, updated);
      setSearchParams({}, { replace: true });
      setEditing(false);
      toast(t("userProfile.saveSuccess"), "", "success");
    } catch (err) {
      toast(
        t("userProfile.saveError"),
        err instanceof Error ? err.message : t("common.error"),
        "destructive",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleStartChat() {
    if (!token || !id) return;
    setStartingChat(true);
    try {
      const room = await getOrCreateDirectRoom(token, id);
      navigate(`/chat?roomId=${room.id}`);
    } catch (err) {
      toast(
        t("userProfile.chatError"),
        err instanceof Error ? err.message : t("common.error"),
        "destructive",
      );
    } finally {
      setStartingChat(false);
    }
  }

  if (loading) {
    return <div className={styles.state}>{t("common.loading")}</div>;
  }

  if (error || !profile) {
    return (
      <div className={`${styles.state} ${styles.stateError}`}>
        {error || t("userProfile.notFound")}
      </div>
    );
  }

  const { participant } = profile;
  const initials = `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase();
  const filteredSkills = ALL_SKILLS.filter((s) =>
    s.toLowerCase().includes(skillSearch.toLowerCase()),
  );

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
        <ChevronLeft size={16} /> {t("common.back")}
      </button>

      <div className={styles.profileCard}>
        <div className={styles.avatarSection}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.nameSection}>
            <h1 className={styles.name}>
              {profile.firstName} {profile.lastName}
            </h1>
            {participant?.position && (
              <span className={styles.position}>
                <Briefcase size={14} />
                {participant.position}
              </span>
            )}
          </div>
        </div>

        <div className={styles.profileActions}>
          {canEdit && !editing && (
            <Button variant="outline" size="md" onClick={openEdit} className={styles.editBtn}>
              <Pencil size={14} />
              {t("userProfile.editProfile")}
            </Button>
          )}
          {!isOwnProfile && (
            <Button
              variant="default"
              size="md"
              onClick={handleStartChat}
              disabled={startingChat}
              className={styles.chatBtn}
            >
              <MessageSquare size={16} />
              {startingChat ? t("userProfile.opening") : t("userProfile.startChat")}
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className={styles.editForm}>
          <div className={styles.editFormHeader}>
            <h2 className={styles.editFormTitle}>{t("userProfile.editProfile")}</h2>
            <button type="button" className={styles.closeEditBtn} onClick={() => closeEdit()}>
              <X size={18} />
            </button>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t("userProfile.positionLabel")}</label>
            <select
              className={styles.formSelect}
              value={editPosition}
              onChange={(e) => setEditPosition(e.target.value)}
            >
              <option value="">{t("userProfile.positionPlaceholder")}</option>
              {ALL_POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t("userProfile.yearsLabel")}</label>
            <input
              type="number"
              min={0}
              max={50}
              className={styles.formInput}
              value={editYears}
              onChange={(e) => setEditYears(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t("userProfile.experienceLabel")}</label>
            <textarea
              className={styles.formTextarea}
              rows={4}
              placeholder={t("userProfile.experiencePlaceholder")}
              value={editExperience}
              onChange={(e) => setEditExperience(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t("userProfile.skillsLabel")}</label>
            {editSkills.length > 0 && (
              <div className={styles.selectedSkills}>
                {editSkills.map((s) => (
                  <span key={s} className={styles.selectedSkillChip}>
                    {s}
                    <button
                      type="button"
                      onClick={() => toggleSkill(s)}
                      className={styles.removeSkillBtn}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <input
              type="text"
              className={styles.formInput}
              placeholder="Search skills…"
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
            />
            <div className={styles.skillCheckboxList}>
              {filteredSkills.map((skill) => (
                <label key={skill} className={styles.skillCheckboxItem}>
                  <input
                    type="checkbox"
                    checked={editSkills.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                  />
                  {skill}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.editFormActions}>
            <Button variant="outline" size="md" onClick={() => closeEdit()} disabled={saving}>
              {t("userProfile.cancelEdit")}
            </Button>
            <Button variant="default" size="md" onClick={handleSave} disabled={saving}>
              {saving ? "…" : t("userProfile.saveProfile")}
            </Button>
          </div>
        </div>
      )}

      {!editing && participant && (
        <div className={styles.sections}>
          {(participant.yearsOfExperience != null || participant.experience) && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Star size={16} /> {t("userProfile.experienceTitle")}
              </h2>
              <div className={styles.experienceGrid}>
                {participant.yearsOfExperience != null && (
                  <div className={styles.expCard}>
                    <span className={styles.expValue}>{participant.yearsOfExperience}</span>
                    <span className={styles.expLabel}>{t("userProfile.yearsOfExperience")}</span>
                  </div>
                )}
              </div>
              {participant.experience && (
                <p className={styles.experienceText}>{participant.experience}</p>
              )}
            </section>
          )}

          {participant.skills && participant.skills.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>
                <Briefcase size={16} /> {t("userProfile.skillsTitle")}
              </h2>
              <div className={styles.skillsGrid}>
                {participant.skills.map((skill) => (
                  <span key={skill} className={styles.skillChip}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {!editing && !participant && (
        <div className={styles.emptyProfile}>
          <p>{t("userProfile.noParticipantData")}</p>
          {canEdit && (
            <Button variant="outline" size="md" onClick={openEdit} style={{ marginTop: "1rem" }}>
              <Pencil size={14} /> {t("userProfile.editProfile")}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
