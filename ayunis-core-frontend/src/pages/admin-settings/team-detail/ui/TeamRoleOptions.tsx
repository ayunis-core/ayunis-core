import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@ayunis/ui/components/popover';
import { SelectItem } from '@ayunis/ui/components/select';
import { useIsFeatureEnabled } from '@/features/feature-toggles';
import {
  TEAM_ROLES,
  type TeamRole,
  type TeamRolePermissionSet,
} from '@/pages/admin-settings/team-detail/model/types';

interface TeamRoleOptionsProps {
  rolePermissions: TeamRolePermissionSet[] | undefined;
}

/**
 * Role options with a card beside the open list listing what the focused role
 * may do in this team, like the model picker's info card.
 */
export function TeamRoleOptions({
  rolePermissions,
}: Readonly<TeamRoleOptionsProps>) {
  const { t } = useTranslation('admin-settings-teams');
  const [focused, setFocused] = useState<TeamRole | null>(null);

  return (
    <Popover open={!!focused}>
      <PopoverAnchor asChild>
        <div>
          {TEAM_ROLES.map((role) => (
            <SelectItem
              key={role}
              value={role}
              onFocus={() => setFocused(role)}
              data-testid={`team-member-role-option-${role}`}
            >
              {t(`teamDetail.memberRole.roles.${role}`)}
            </SelectItem>
          ))}
        </div>
      </PopoverAnchor>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={12}
        alignOffset={-4}
        className="w-80"
        onOpenAutoFocus={(e) => e.preventDefault()}
        data-testid="team-member-role-hint"
      >
        {focused && (
          <TeamRoleCard
            role={focused}
            permissions={
              rolePermissions?.find((set) => set.role === focused)?.permissions
            }
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function TeamRoleCard({
  role,
  permissions,
}: Readonly<{
  role: TeamRole;
  permissions: TeamRolePermissionSet['permissions'] | undefined;
}>) {
  const { t } = useTranslation('admin-settings-teams');
  const recordingsEnabled = useIsFeatureEnabled('recordingsEnabled');
  // Not a matrix permission: the backend reserves role changes and removing
  // team admins for team admins.
  const items = [
    ...(permissions ?? []).filter(
      (permission) =>
        recordingsEnabled || permission !== 'manage_team_recordings',
    ),
    ...(role === 'admin' ? ['manage_roles'] : []),
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">
        {t(`teamDetail.memberRole.roles.${role}`)}
      </p>
      {permissions &&
        (items.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm">{t('teamDetail.memberRole.card.intro')}</p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm"
                  data-testid={`team-member-role-hint-item-${item}`}
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {t(`teamDetail.memberRole.card.items.${item}`)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm">{t('teamDetail.memberRole.card.none')}</p>
        ))}
      <p className="-mx-4 border-t px-4 pt-3 text-xs text-muted-foreground">
        {t(
          role === 'admin'
            ? 'teamDetail.memberRole.card.adminFooter'
            : 'teamDetail.memberRole.card.footer',
        )}
      </p>
    </div>
  );
}
