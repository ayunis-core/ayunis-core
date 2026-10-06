import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export function PermissionHint({
  label,
  hint,
  isNew = false,
}: Readonly<{ label: string; hint?: string; isNew?: boolean }>) {
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      {hint && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`Weitere Informationen zu ${label}`}
            >
              <Info />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{hint}</TooltipContent>
        </Tooltip>
      )}
      {isNew && <Badge variant="secondary">Neu</Badge>}
    </span>
  );
}

export function PermissionGroupRow({
  label,
  columns,
}: Readonly<{ label: string; columns: number }>) {
  return (
    <tr className="bg-muted/50">
      <td
        colSpan={columns}
        className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </td>
    </tr>
  );
}

export interface MatrixCell {
  checked: boolean;
  label: string;
  onToggle?: () => void;
}

export function PermissionRow({
  label,
  cells,
}: Readonly<{ label: ReactNode; cells: MatrixCell[] }>) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      {cells.map((cell) => (
        <TableCell key={cell.label} className="text-center">
          <Checkbox
            checked={cell.checked}
            disabled={!cell.onToggle}
            onCheckedChange={cell.onToggle}
            aria-label={cell.label}
          />
        </TableCell>
      ))}
    </TableRow>
  );
}

export interface MatrixColumn {
  key: string;
  header: ReactNode;
}

export function PermissionTable({
  columns,
  children,
}: Readonly<{ columns: MatrixColumn[]; children: ReactNode }>) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Berechtigung</TableHead>
          {columns.map((column) => (
            <TableHead key={column.key} align="center">
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  );
}
