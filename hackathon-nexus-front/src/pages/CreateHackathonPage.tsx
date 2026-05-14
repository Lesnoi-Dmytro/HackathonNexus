import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ALL_TOPICS, createHackathon, type HackathonTopic } from "../api/hackathons";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationsContext";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import { Select } from "../shared/ui/Select";
import styles from "./CreateHackathonPage.module.css";

interface FormErrors {
  title?: string;
  description?: string;
  topic?: string;
  startDate?: string;
  durationHours?: string;
  maxTeamSize?: string;
  maxParticipants?: string;
}

export function CreateHackathonPage() {
  const { token } = useAuth();
  const { toast } = useNotifications();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topic, setTopic] = useState<HackathonTopic | "">("");
  const [startDate, setStartDate] = useState("");
  const [durationHours, setDurationHours] = useState("");
  const [maxTeamSize, setMaxTeamSize] = useState("");
  const [maxParticipants, setMaxParticipants] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const topicOptions = ALL_TOPICS.map((tp) => ({ value: tp, label: tp }));

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!title.trim()) e.title = t("common.error");
    if (!description.trim()) e.description = t("common.error");
    if (!topic) e.topic = t("common.error");
    if (!startDate) e.startDate = t("common.error");
    if (!durationHours || Number(durationHours) < 1) e.durationHours = t("common.error");
    if (!maxTeamSize || Number(maxTeamSize) < 1) e.maxTeamSize = t("common.error");
    if (maxParticipants && Number(maxParticipants) < 1) e.maxParticipants = t("common.error");
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    if (!token) return;
    setSubmitting(true);
    try {
      const hackathon = await createHackathon(token, {
        title: title.trim(),
        description: description.trim(),
        topic: topic as HackathonTopic,
        startDate: new Date(startDate).toISOString(),
        durationHours: Number(durationHours),
        maxTeamSize: Number(maxTeamSize),
        ...(maxParticipants ? { maxParticipants: Number(maxParticipants) } : {}),
      });
      toast(
        t("createHackathon.successTitle"),
        t("createHackathon.successMessage", { title: hackathon.title }),
        "success",
      );
      navigate(`/hackathons/${hackathon.id}`);
    } catch (err) {
      toast(
        t("createHackathon.errorTitle"),
        err instanceof Error ? err.message : String(err),
        "destructive",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate("/hackathons")}>
        <ChevronLeft size={16} />
        {t("createHackathon.backToHackathons")}
      </button>

      <h1 className={styles.heading}>{t("createHackathon.title")}</h1>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Input
          label={t("createHackathon.fieldTitle")}
          placeholder={t("createHackathon.fieldTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        <div className={styles.field}>
          <label className={styles.label}>{t("createHackathon.fieldDescription")}</label>
          <textarea
            className={`${styles.textarea}${errors.description ? ` ${styles.errorField}` : ""}`}
            placeholder={t("createHackathon.fieldDescriptionPlaceholder")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          {errors.description && <span className={styles.errorMsg}>{errors.description}</span>}
        </div>

        <Select
          label={t("createHackathon.fieldTopic")}
          options={topicOptions}
          value={topic}
          onValueChange={(v) => setTopic(v as HackathonTopic)}
          placeholder={t("createHackathon.fieldTopic")}
          error={errors.topic}
        />

        <div className={styles.row}>
          <Input
            label={t("createHackathon.fieldStartDate")}
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            error={errors.startDate}
          />
          <Input
            label={t("createHackathon.fieldDurationHours")}
            type="number"
            min={1}
            placeholder="24"
            value={durationHours}
            onChange={(e) => setDurationHours(e.target.value)}
            error={errors.durationHours}
          />
        </div>

        <div className={styles.row}>
          <Input
            label={t("createHackathon.fieldMaxTeamSize")}
            type="number"
            min={1}
            placeholder="4"
            value={maxTeamSize}
            onChange={(e) => setMaxTeamSize(e.target.value)}
            error={errors.maxTeamSize}
          />
          <Input
            label={t("createHackathon.fieldMaxParticipants")}
            type="number"
            min={1}
            placeholder={t("createHackathon.fieldMaxParticipantsPlaceholder")}
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(e.target.value)}
            error={errors.maxParticipants}
          />
        </div>

        <div className={styles.submitRow}>
          <Button type="submit" disabled={submitting} size="lg">
            {submitting ? t("createHackathon.submitting") : t("createHackathon.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
