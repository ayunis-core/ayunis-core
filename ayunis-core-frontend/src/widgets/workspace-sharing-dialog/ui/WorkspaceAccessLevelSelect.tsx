import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  WORKSPACE_ACCESS_LEVELS,
  type WorkspaceAccessLevel,
} from '@/widgets/workspace-sharing-dialog/model/types';

interface WorkspaceAccessLevelSelectProps {
  value: WorkspaceAccessLevel;
  onChange: (accessLevel: WorkspaceAccessLevel) => void;
  disabled?: boolean;
  testId?: string;
}

export function WorkspaceAccessLevelSelect({
  value,
  onChange,
  disabled,
  testId,
}: Readonly<WorkspaceAccessLevelSelectProps>) {
  const { t } = useTranslation('workspaces');

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as WorkspaceAccessLevel)}
      disabled={disabled}
    >
      <SelectTrigger data-testid={testId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {WORKSPACE_ACCESS_LEVELS.map((accessLevel) => (
          <SelectItem key={accessLevel} value={accessLevel}>
            {t(`sharing.accessLevels.${accessLevel}.label`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
