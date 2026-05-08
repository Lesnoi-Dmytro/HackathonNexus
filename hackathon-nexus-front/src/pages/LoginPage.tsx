import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../shared/ui/Button";
import { Input } from "../shared/ui/Input";
import styles from "./AuthPage.module.css";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const { accessToken, user } = await login({ email, password });
      setAuth(accessToken, user);
      navigate("/hackathons", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.loginFailed"));
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
        <h1 className={styles.title}>{t("auth.signIn")}</h1>
        <p className={styles.subtitle}>{t("auth.welcomeBack")}</p>

        <form onSubmit={handleSubmit} className={styles.form}>
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
            autoComplete="current-password"
            required
          />

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" size="lg" disabled={isSubmitting} className={styles.submit}>
            {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
        </form>

        <p className={styles.footer}>
          {t("auth.noAccount")}{" "}
          <Link to="/register" className={styles.link}>
            {t("auth.createOne")}
          </Link>
        </p>
      </div>
    </div>
  );
}
