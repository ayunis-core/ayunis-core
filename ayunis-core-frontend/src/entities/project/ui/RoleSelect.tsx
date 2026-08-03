import * as SelectPrimitive from '@radix-ui/react-select';
import { CheckIcon } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import {
  PROJECT_ROLE_ORDER,
  PROJECT_ROLE_LABELS,
  PROJECT_ROLE_DESCRIPTIONS,
  type ProjectRole,
} from '../model/mock';

const REMOVE_VALUE = '__remove';

interface RoleSelectProps {
  value: ProjectRole;
  onChange: (role: ProjectRole) => void;
  onRemove?: () => void;
  removeLabel?: string;
  triggerClassName?: string;
}

function RoleItem({ role }: Readonly<{ role: ProjectRole }>) {
  return (
    <SelectPrimitive.Item
      value={role}
      className="relative flex w-full cursor-default select-none flex-col items-start gap-0.5 rounded-sm py-1.5 pr-8 pl-2 leading-tight outline-hidden focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
    >
      <span className="absolute top-1/2 right-2 flex size-3.5 -translate-y-1/2 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>
        <span className="text-sm leading-none">
          {PROJECT_ROLE_LABELS[role]}
        </span>
      </SelectPrimitive.ItemText>
      <span className="text-xs leading-snug text-muted-foreground">
        {PROJECT_ROLE_DESCRIPTIONS[role]}
      </span>
    </SelectPrimitive.Item>
  );
}

export function RoleSelect({
  value,
  onChange,
  onRemove,
  removeLabel = 'Entfernen',
  triggerClassName = 'w-40 shrink-0',
}: Readonly<RoleSelectProps>) {
  function handleValueChange(next: string) {
    if (next === REMOVE_VALUE) {
      onRemove?.();
      return;
    }
    onChange(next as ProjectRole);
  }

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_ROLE_ORDER.map((role) => (
          <RoleItem key={role} role={role} />
        ))}
        {onRemove && (
          <>
            <SelectSeparator />
            <SelectPrimitive.Item
              value={REMOVE_VALUE}
              className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pr-8 pl-2 text-sm leading-none text-destructive outline-hidden focus:bg-destructive/10 focus:text-destructive dark:focus:bg-destructive/20"
            >
              <SelectPrimitive.ItemText>{removeLabel}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          </>
        )}
      </SelectContent>
    </Select>
  );
}
