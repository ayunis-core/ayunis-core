import { Crown } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/shadcn/sidebar';
import { useHasActiveSubscription } from '../api/useHasActiveSubscription';
import { useTranslation } from 'react-i18next';

export function SubscriptionHintButton() {
  const { hasSubscription, isLoading, error } = useHasActiveSubscription();
  const { t } = useTranslation('common');

  if (isLoading || error || hasSubscription) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            className="bg-gradient-to-r from-[#62589F] to-[#A7A0CA] text-white hover:text-white active:text-white"
            asChild
          >
            <Link to="/admin-settings/billing">
              <Crown className="size-4" />
              <span className="font-medium">{t('sidebar.upgrade')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
