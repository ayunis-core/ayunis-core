import type { i18n } from 'i18next';

export type OfficeAddinLanguage = 'de' | 'en';

export function resolveOfficeAddinLanguage(
  displayLanguage: string,
): OfficeAddinLanguage {
  return displayLanguage.toLowerCase().startsWith('de') ? 'de' : 'en';
}

export function applyOfficeAddinLanguage(
  instance: i18n,
  displayLanguage: string,
): void {
  const language = resolveOfficeAddinLanguage(displayLanguage);
  document.documentElement.lang = language;
  void instance.changeLanguage(language);
}
