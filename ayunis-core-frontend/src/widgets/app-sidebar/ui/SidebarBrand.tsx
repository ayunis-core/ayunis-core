import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import brandSignetLight from '@/shared/assets/brand/brand-signet-light.png';
import { useTheme } from '@/features/theme';
import { cn } from '@/shared/lib/shadcn/utils';
import { useSidebar } from '@/shared/ui/shadcn/sidebar';

export function SidebarBrand() {
  const { theme } = useTheme();
  const { state } = useSidebar();
  const { t } = useTranslation('common');
  const isCollapsed = state === 'collapsed';
  let brandSrc = brandFullLight;
  if (isCollapsed) {
    brandSrc = brandSignetLight;
  } else if (theme === 'dark') {
    brandSrc = brandFullDark;
  }

  return (
    <img
      src={brandSrc}
      alt={t('sidebar.appName')}
      className={cn(
        'object-contain',
        isCollapsed ? 'size-8 rounded-lg' : 'w-full max-w-32',
      )}
    />
  );
}

export function SidebarBrandLink({
  className,
}: Readonly<{ className?: string }>) {
  return (
    <Link to="/" className={className}>
      <SidebarBrand />
    </Link>
  );
}
