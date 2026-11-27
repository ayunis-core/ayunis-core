import { useTranslation } from 'react-i18next';
import { Megaphone } from 'lucide-react';
import { formatReleaseNoteDate } from '@/features/release-notes';

export function ReleaseNoteKicker({ date }: Readonly<{ date: string }>) {
  const { t, i18n } = useTranslation('release-notes');

  return (
    <span className="flex items-center gap-2">
      <Megaphone className="size-4" aria-hidden />
      {t('detail.kicker', {
        date: formatReleaseNoteDate(date, i18n.language),
      })}
    </span>
  );
}
