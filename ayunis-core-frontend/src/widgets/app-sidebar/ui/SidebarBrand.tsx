import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import { useTheme } from '@/features/theme';

export function SidebarBrand() {
  const { theme } = useTheme();
  const { t } = useTranslation('common');
  const brandSrc = theme === 'dark' ? brandFullDark : brandFullLight;

  return (
    <img
      src={brandSrc}
      alt={t('sidebar.appName')}
      className="w-full max-w-32 object-contain"
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
