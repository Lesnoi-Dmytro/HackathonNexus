import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { register, type UserRole } from "../api/auth";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import { Select } from "../shared/ui/Select";
import styles from "./AuthPage.module.css";

const ROLE_OPTIONS = [
  { value: "participant", label: "auth.roleParticipant" },
  { value: "hackathon-admin", label: "auth.roleAdmin" },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { t } = useTranslation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("participant");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { accessToken, user } = await register({ firstName, lastName, email, password, role });
      setAuth(accessToken, user);
      navigate(role === "participant" ? `/users/${user.id}?edit=1` : "/hackathons", {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.registrationFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.langSwitch}>
        <LanguageSwitcher />
      </div>
      <div className={styles.card}>
        <h1 className={styles.title}>{t("auth.createAccount")}</h1>
        <p className={styles.subtitle}>{t("auth.joinSubtitle")}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.row}>
            <Input
              label={t("auth.firstName")}
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
            />
            <Input
              label={t("auth.lastName")}
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
            />
          </div>
          <Input
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <Select
            label={t("auth.role")}
            value={role}
            onValueChange={(v) => setRole(v as UserRole)}
            options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: t(o.label) }))}
          />

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" size="lg" disabled={isSubmitting} className={styles.submit}>
            {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
          </Button>
        </form>

        <p className={styles.footer}>
          {t("auth.alreadyHaveAccount")}{" "}
          <Link to="/login" className={styles.link}>
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
