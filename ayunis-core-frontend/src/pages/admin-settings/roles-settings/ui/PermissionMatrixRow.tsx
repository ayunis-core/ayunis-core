import { Checkbox } from '@ayunis/ui/components/checkbox';
import { TableCell, TableRow } from '@ayunis/ui/components/table';
import type {
  EditableRole,
  Permission,
} from '@/pages/admin-settings/roles-settings/model/types';
import { InfoHint } from './InfoHint';

interface PermissionMatrixRowProps {
  permission: Permission;
  label: string;
  hint: string;
  userChecked: boolean;
  managerChecked: boolean;
  disabled: boolean;
  onToggle: (role: EditableRole) => void;
}

export function PermissionMatrixRow({
  permission,
  label,
  hint,
  userChecked,
  managerChecked,
  disabled,
  onToggle,
}: Readonly<PermissionMatrixRowProps>) {
  return (
    <TableRow>
      <TableCell className="font-medium">
        <InfoHint
          label={label}
          hint={hint}
          testId={`permission-hint-${permission}`}
        />
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
