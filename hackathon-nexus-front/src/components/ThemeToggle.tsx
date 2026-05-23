import { Moon, Sun } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import styles from "./LanguageSwitcher.module.css";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className={styles.btn}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
