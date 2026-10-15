import { useTranslation } from 'react-i18next';
import { Badge } from '@ayunis/ui/components/badge';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import { TableCell, TableRow } from '@ayunis/ui/components/table';
import type {
  EditableRole,
  Permission,
} from '@/pages/admin-settings/roles-settings/model/types';
import { InfoHint } from '@/shared/ui/info-hint';

interface PermissionMatrixRowProps {
  permission: Permission;
  label: string;
  hint: string;
  isNew: boolean;
  userChecked: boolean;
  managerChecked: boolean;
  disabled: boolean;
  onToggle: (role: EditableRole) => void;
}

export function PermissionMatrixRow({
  permission,
  label,
  hint,
  isNew,
  userChecked,
  managerChecked,
  disabled,
  onToggle,
}: Readonly<PermissionMatrixRowProps>) {
  const { t } = useTranslation('admin-settings-roles');

  return (
    <TableRow data-testid={`permission-row-${permission}`}>
      <TableCell className="font-medium">
        <span className="inline-flex items-center gap-2">
          <InfoHint
            label={label}
            hint={hint}
            testId={`permission-hint-${permission}`}
          />
          {isNew && <Badge variant="secondary">{t('newBadge')}</Badge>}
        </span>
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={userChecked}
          disabled={disabled}
          onCheckedChange={() => onToggle('user')}
          aria-label={`${permission}-user`}
        />
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={managerChecked}
          disabled={disabled}
          onCheckedChange={() => onToggle('manager')}
          aria-label={`${permission}-manager`}
        />
      </TableCell>
      <TableCell className="text-center">
        <Checkbox checked disabled aria-label={`${permission}-admin`} />
      </TableCell>
    </TableRow>
  );
}
