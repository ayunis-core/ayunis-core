import i18n from '@/i18n';

export const HELP_CENTER_BASE_URL = 'https://docs.ayunis.com';

export function getHelpCenterUrl(path: string): string {
  const locale = i18n.language === 'en' ? 'en' : 'de';
  return `${HELP_CENTER_BASE_URL}/${locale}/${path}`;
}
