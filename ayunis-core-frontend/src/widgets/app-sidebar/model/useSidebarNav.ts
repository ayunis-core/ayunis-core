import {
  Brain,
  CalendarClock,
  FolderOpen,
  GraduationCap,
  Plus,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMarketplaceConfig } from '@/features/marketplace';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import { useAuthorization } from '@/features/permissions';
import {
  ACADEMY_LANDING_PAGE_URL,
  useAcademyAccessStatus,
  useIsAcademyAddonActive,
} from '@/features/academy';

export type SidebarNavItemId =
  | 'new-chat'
  | 'workspaces'
  | 'skills'
  | 'knowledge'
  | 'routines'
  | 'marketplace'
  | 'academy';

export interface SidebarNavItem {
  id: SidebarNavItemId;
  title: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
  external?: boolean;
  testId?: string;
}

export interface SidebarNav {
  primary: SidebarNavItem[];
  secondary: SidebarNavItem[];
  routinesEnabled: boolean;
}

export function isNavItemActive(
  pathname: string,
  item: SidebarNavItem,
): boolean {
  if (item.external) return false;
  return item.exact ? pathname === item.url : pathname.startsWith(item.url);
}

function useSecondaryItems(): SidebarNavItem[] {
  const { t } = useTranslation('common');
  const marketplace = useMarketplaceConfig();
  const academyAddonActive = useIsAcademyAddonActive();
  const marketplaceItems: SidebarNavItem[] =
    marketplace.enabled && marketplace.url
      ? [
          {
            id: 'marketplace',
            title: t('sidebar.marketplace'),
            url: marketplace.url,
            icon: Store,
            external: true,
          },
        ]
      : [];
  return [
    ...marketplaceItems,
    {
      id: 'academy',
      title: t('sidebar.academy'),
      url: academyAddonActive ? '/academy' : ACADEMY_LANDING_PAGE_URL,
      icon: GraduationCap,
      external: !academyAddonActive,
    },
  ];
}

export function useSidebarNav(): SidebarNav {
  const { t } = useTranslation('common');
  const authorization = useAuthorization();
  const routinesEnabled = useIsFeatureEnabled('routinesEnabled');
  const canManageRoutines =
    routinesEnabled && authorization.can('manage_routines');
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  const secondary = useSecondaryItems();
  const primary: SidebarNavItem[] = [
    {
      id: 'new-chat',
      title: t('sidebar.newChat'),
      url: '/chat',
      icon: Plus,
      exact: true,
      disabled: isAcademyGated,
      testId: 'sidebar-navigation-new-chat',
    },
    {
      id: 'workspaces',
      title: t('sidebar.workspaces'),
      url: '/workspaces',
      icon: FolderOpen,
      exact: true,
    },
    {
      id: 'skills',
      title: t('sidebar.skills'),
      url: '/skills',
      icon: Sparkles,
    },
    {
      id: 'knowledge',
      title: t('sidebar.knowledge'),
      url: '/knowledge-bases',
      icon: Brain,
    },
    ...(canManageRoutines
      ? [
          {
            id: 'routines' as const,
            title: t('sidebar.routines'),
            url: '/routines',
            icon: CalendarClock,
            testId: 'sidebar-navigation-routines',
          },
        ]
      : []),
  ];
  return { primary, secondary, routinesEnabled };
}
