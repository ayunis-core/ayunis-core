import { ChevronUp, LogOut, Settings2, User2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { useMe } from '@/widgets/app-sidebar/api/useMe';
import { useLogout } from '@/widgets/app-sidebar/api/useLogout';
import { MeResponseDtoSystemRole } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  allowedSettingsSections,
  useAuthorization,
} from '@/features/permissions';

interface UserMenuContentProps {
  side?: 'bottom' | 'right';
  className?: string;
}

export function UserMenuContent({
  side = 'bottom',
  className = 'w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg',
}: Readonly<UserMenuContentProps>) {
  const { user } = useMe();
  const authorization = useAuthorization();
  const canOpenSettings = allowedSettingsSections(authorization).length > 0;
  const { logout } = useLogout();
  const { t } = useTranslation('common');
  return (
    <DropdownMenuContent
      className={className}
      side={side}
      align="end"
      sideOffset={4}
    >
      <DropdownMenuItem asChild>
        <Link to="/settings/general">
          <User2 />
          {t('sidebar.accountSettings')}
        </Link>
      </DropdownMenuItem>
      {canOpenSettings && (
        <DropdownMenuItem asChild>
          <Link to="/admin-settings">
            <Settings2 />
            {t('sidebar.adminSettings')}
          </Link>
        </DropdownMenuItem>
      )}
      {user?.systemRole === MeResponseDtoSystemRole.super_admin && (
        <DropdownMenuItem asChild>
          <Link to="/super-admin-settings">
            <Settings2 />
            {t('sidebar.superAdminSettings')}
          </Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={logout}>
        <LogOut />
        {t('sidebar.signOut')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

export function SidebarUserMenu() {
  const { user } = useMe();
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton
            size="lg"
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            data-testid="menu"
          >
            <User2 className="size-4" />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user?.name}</span>
              <span className="truncate text-xs">{user?.email}</span>
            </div>
            <ChevronUp className="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <UserMenuContent />
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
