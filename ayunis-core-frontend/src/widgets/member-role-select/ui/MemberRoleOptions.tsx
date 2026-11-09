import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@ayunis/ui/components/popover';
import { SelectItem } from '@ayunis/ui/components/select';
import type {
  MemberRole,
  MemberRolePermissionSet,
  MemberRoleTranslation,
} from '@/widgets/member-role-select/model/types';

interface MemberRoleOptionsProps {
  roles: readonly MemberRole[];
  rolePermissions: readonly MemberRolePermissionSet[] | undefined;
  adminOnlyItems: readonly string[];
  translation: MemberRoleTranslation;
  testIdPrefix: string;
}

/**
 * Role options with a card beside the open list listing what the focused role
 * may do, like the model picker's info card.
 */
export function MemberRoleOptions({
  roles,
  rolePermissions,
  adminOnlyItems,
  translation,
  testIdPrefix,
}: Readonly<MemberRoleOptionsProps>) {
  const { t } = useTranslation(translation.namespace, {
    keyPrefix: translation.keyPrefix,
  });
  const [focused, setFocused] = useState<MemberRole | null>(null);

  return (
    <Popover open={!!focused}>
      <PopoverAnchor asChild>
        <div>
          {roles.map((role) => (
            <SelectItem
              key={role}
              value={role}
              onFocus={() => setFocused(role)}
              data-testid={`${testIdPrefix}-option-${role}`}
            >
              {t(`roles.${role}`)}
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
        data-testid={`${testIdPrefix}-hint`}
      >
        {focused && (
          <MemberRoleCard
            role={focused}
            permissions={
              rolePermissions?.find((set) => set.role === focused)?.permissions
            }
            adminOnlyItems={adminOnlyItems}
            translation={translation}
            testIdPrefix={testIdPrefix}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}

function MemberRoleCard({
  role,
  permissions,
  adminOnlyItems,
  translation,
  testIdPrefix,
}: Readonly<{
  role: MemberRole;
  permissions: readonly string[] | undefined;
  adminOnlyItems: readonly string[];
  translation: MemberRoleTranslation;
  testIdPrefix: string;
}>) {
  const { t } = useTranslation(translation.namespace, {
    keyPrefix: translation.keyPrefix,
  });
  const items = [
    ...(permissions ?? []),
    ...(role === 'admin' ? adminOnlyItems : []),
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{t(`roles.${role}`)}</p>
      {permissions &&
        (items.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-sm">{t('card.intro')}</p>
            <ul className="space-y-1">
              {items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm"
                  data-testid={`${testIdPrefix}-hint-item-${item}`}
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  {t(`card.items.${item}`)}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm">{t('card.none')}</p>
        ))}
      <p className="-mx-4 border-t px-4 pt-3 text-xs text-muted-foreground">
        {t(role === 'admin' ? 'card.adminFooter' : 'card.footer')}
      </p>
    </div>
  );
}
