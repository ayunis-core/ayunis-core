import { useTranslation } from 'react-i18next';
import { TRUST_BADGES } from '../model/showcase-content';

export function TrustBadges() {
  const { t } = useTranslation('auth');

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {TRUST_BADGES.map(({ icon: Icon, labelKey }) => (
        <span
          key={labelKey}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-zinc-700/50 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm"
        >
          <Icon className="h-4 w-4 text-white" strokeWidth={1.75} />
          {t(labelKey)}
        </span>
      ))}
    </div>
  );
}
