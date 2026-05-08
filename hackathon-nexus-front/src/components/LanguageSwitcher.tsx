import { useTranslation } from "react-i18next";
import styles from "./LanguageSwitcher.module.css";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const isUk = i18n.language.startsWith("uk");

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={() => i18n.changeLanguage(isUk ? "en" : "uk")}
      aria-label="Switch language"
    >
      {isUk ? "EN" : "UA"}
    </button>
  );
}
