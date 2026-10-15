import { SidebarMenuBadge } from '@ayunis/ui/components/sidebar';
import { useTranslation } from 'react-i18next';

export function RequestsSidebarBadge({
  count,
  testId,
}: Readonly<{ count: number; testId: string }>) {
  const { t } = useTranslation('resource-handover');
  if (count === 0) return null;
  return (
    <SidebarMenuBadge
      aria-label={t('requests.count', { count })}
      className="rounded-full bg-brand text-brand-foreground peer-hover/menu-button:text-brand-foreground peer-data-[active=true]/menu-button:text-brand-foreground"
      data-testid={testId}
    >
      {count}
    </SidebarMenuBadge>
  );
}
