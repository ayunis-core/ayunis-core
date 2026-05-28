import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import { useTheme } from '@/features/theme';
import { cn } from '@/shared/lib/shadcn/utils';
import { useSidebar } from '@/shared/ui/shadcn/sidebar';

/** Max distance from the account divider line (px). */
const MAX_OFFSET_FROM_ACCOUNT_LINE_PX = 100;

/** Logo width in the collapsed sidebar (px). */
const VERTICAL_BRAND_WIDTH_PX = 28;

/** Matches rotated horizontal wordmark (492×109 viewBox). */
const VERTICAL_BRAND_HEIGHT_PX = Math.round(
  (492 / 109) * VERTICAL_BRAND_WIDTH_PX,
);

export function SidebarVerticalBrand() {
  const { isIconCollapsed } = useSidebar();
  const { theme } = useTheme();
  const { t } = useTranslation('common');
  const isCollapsed = isIconCollapsed;
  const brandSrc = theme === 'dark' ? brandFullDark : brandFullLight;

  return (
    <div
      className={cn(
        'w-full shrink-0 overflow-hidden transition-all duration-300 ease-in-out',
        isCollapsed ? 'mt-auto opacity-100' : 'h-0 opacity-0',
      )}
      style={
        isCollapsed
          ? {
              paddingBottom: `min(1.5rem, ${MAX_OFFSET_FROM_ACCOUNT_LINE_PX}px)`,
            }
          : undefined
      }
      aria-hidden={!isCollapsed}
    >
      <Link
        to="/"
        className="flex w-full justify-center px-2"
        tabIndex={isCollapsed ? 0 : -1}
      >
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: VERTICAL_BRAND_WIDTH_PX,
            height: VERTICAL_BRAND_HEIGHT_PX,
          }}
        >
          <img
            src={brandSrc}
            alt={t('sidebar.appName')}
            className="absolute top-1/2 left-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 -rotate-90 object-contain"
            style={{ width: VERTICAL_BRAND_HEIGHT_PX }}
          />
        </div>
      </Link>
    </div>
  );
}
