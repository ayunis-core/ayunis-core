import { useTranslation } from 'react-i18next';

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/shared/ui/shadcn/sidebar';
import { SidebarBrandLink } from './SidebarBrand';
import { ReleaseNotesButton } from './ReleaseNotesButton';
import config from '@/shared/config';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';

interface SidebarHeaderControlsProps {
  isCollapsed: boolean;
  sidebarToggleLabel: string;
}

/** Matches expanded logo row (`SidebarMenuButton` size lg). */
const HEADER_ROW_HEIGHT_CLASS = 'h-12';

export function SidebarHeaderControls({
  isCollapsed,
  sidebarToggleLabel,
}: Readonly<SidebarHeaderControlsProps>) {
  const { t } = useTranslation('common');
  const showReleaseNotes = Boolean(config.features.announcableOrgId);

  const expandTrigger = (
    <Tooltip>
      <TooltipTrigger asChild>
        <SidebarTrigger
          className="size-8 shrink-0"
          data-testid="sidebar-trigger"
          aria-label={sidebarToggleLabel}
        />
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        {t('sidebar.toggleShortcut')}
      </TooltipContent>
    </Tooltip>
  );

  const logoRightInset = showReleaseNotes ? 'right-16' : 'right-8';

  return (
    <SidebarMenu>
      <SidebarMenuItem className="!p-0">
        <div
          className={cn(
            'relative w-full',
            showReleaseNotes && isCollapsed && 'h-20',
          )}
        >
          <div className={cn('relative w-full', HEADER_ROW_HEIGHT_CLASS)}>
            <div
              className={cn(
                'absolute inset-y-0 left-0 flex items-center overflow-hidden transition-[opacity,width] duration-200 ease-linear',
                isCollapsed
                  ? 'pointer-events-none w-0 opacity-0'
                  : cn('opacity-100', logoRightInset),
              )}
              aria-hidden={isCollapsed}
            >
              <SidebarMenuButton
                size="lg"
                asChild
                className={cn('h-12 min-w-0 flex-1', HEADER_ROW_HEIGHT_CLASS)}
                tooltip={t('sidebar.appName')}
              >
                <SidebarBrandLink />
              </SidebarMenuButton>
            </div>

            {showReleaseNotes && !isCollapsed && (
              <div className="absolute top-1/2 right-8 -translate-y-1/2">
                <ReleaseNotesButton />
              </div>
            )}

            <div
              className={cn(
                'absolute top-1/2 z-10 -translate-y-1/2 transition-[left,transform] duration-200 ease-linear',
                isCollapsed
                  ? 'left-1/2 -translate-x-1/2'
                  : 'right-0 translate-x-0',
              )}
            >
              <div className="hidden md:block">{expandTrigger}</div>
            </div>
          </div>

          {showReleaseNotes && isCollapsed && (
            <div className="absolute left-1/2 top-14 -translate-x-1/2">
              <ReleaseNotesButton />
            </div>
          )}
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
