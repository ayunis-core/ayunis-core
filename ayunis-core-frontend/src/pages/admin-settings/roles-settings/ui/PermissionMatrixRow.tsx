import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { TableCell, TableRow } from '@/shared/ui/shadcn/table';
import type { EditableRole, Permission } from '../model/types';

interface PermissionMatrixRowProps {
  permission: Permission;
  label: string;
  userChecked: boolean;
  managerChecked: boolean;
  disabled: boolean;
  onToggle: (role: EditableRole) => void;
}

export function PermissionMatrixRow({
  permission,
  label,
  userChecked,
  managerChecked,
  disabled,
  onToggle,
}: Readonly<PermissionMatrixRowProps>) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
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
