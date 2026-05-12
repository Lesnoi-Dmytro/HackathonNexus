import type { Locale } from "date-fns";
import { format } from "date-fns";
import { enUS, uk } from "date-fns/locale";

const localeMap: Record<string, Locale> = {
  en: enUS,
  uk: uk,
};

function getLocale(lang: string): Locale {
  return localeMap[lang] ?? enUS;
}

export function formatDateShort(iso: string, lang: string): string {
  return format(new Date(iso), "PP", { locale: getLocale(lang) });
}

export function formatDateLong(iso: string, lang: string): string {
  return format(new Date(iso), "PPp", { locale: getLocale(lang) });
}
