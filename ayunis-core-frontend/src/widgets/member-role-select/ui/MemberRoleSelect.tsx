import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import type {
  MemberRole,
  MemberRolePermissionSet,
  MemberRoleTranslation,
} from '@/widgets/member-role-select/model/types';
import { MemberRoleOptions } from './MemberRoleOptions';

interface MemberRoleSelectProps {
  value: MemberRole;
  onValueChange: (role: MemberRole) => void;
  roles: readonly MemberRole[];
  rolePermissions: readonly MemberRolePermissionSet[] | undefined;
  /** Listed on the admin card after the role's permissions. */
  adminOnlyItems?: readonly string[];
  translation: MemberRoleTranslation;
  ariaLabel: string;
  disabled?: boolean;
  triggerTestId: string;
  /** Prefix of the option, hint card and hint item test ids. */
  testIdPrefix: string;
}

export function MemberRoleSelect({
  value,
  onValueChange,
  roles,
  rolePermissions,
  adminOnlyItems = [],
  translation,
  ariaLabel,
  disabled = false,
  triggerTestId,
  testIdPrefix,
}: Readonly<MemberRoleSelectProps>) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        size="sm"
        disabled={disabled}
        aria-label={ariaLabel}
        data-testid={triggerTestId}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <MemberRoleOptions
          roles={roles}
          rolePermissions={rolePermissions}
          adminOnlyItems={adminOnlyItems}
          translation={translation}
          testIdPrefix={testIdPrefix}
        />
      </SelectContent>
    </Select>
  );
}
