import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  WORKSPACE_ROLES,
  type WorkspaceRole,
} from '@/widgets/workspace-sharing-dialog/model/types';

interface WorkspaceRoleSelectProps {
  value: WorkspaceRole;
  onChange: (role: WorkspaceRole) => void;
  disabled?: boolean;
  testId?: string;
}

export function WorkspaceRoleSelect({
  value,
  onChange,
  disabled,
  testId,
}: Readonly<WorkspaceRoleSelectProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as WorkspaceRole)}
      disabled={disabled}
    >
      <SelectTrigger className="w-40" data-testid={testId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WORKSPACE_ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {t(`sharing.roles.${role}.label`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
