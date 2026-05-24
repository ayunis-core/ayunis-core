import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import brandFullVerticalLight from '@/shared/assets/brand/brand-full-vertical-light.png';
import { cn } from '@/shared/lib/shadcn/utils';
import { useSidebar } from '@/shared/ui/shadcn/sidebar';

/** Max distance from the account divider line (px). */
const MAX_OFFSET_FROM_ACCOUNT_LINE_PX = 100;

/** Logo width in the collapsed sidebar (px). */
const VERTICAL_BRAND_WIDTH_PX = 28;

export function SidebarVerticalBrand() {
  const { state } = useSidebar();
  const { t } = useTranslation('common');
  const isCollapsed = state === 'collapsed';

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
        <img
          src={brandFullVerticalLight}
          alt={t('sidebar.appName')}
          width={VERTICAL_BRAND_WIDTH_PX}
          className="h-auto w-7 object-contain"
        />
      </Link>
    </div>
  );
}
