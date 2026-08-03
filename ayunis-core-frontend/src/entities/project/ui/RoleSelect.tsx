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

export type RoleSelectValue = ProjectRole | 'none';

interface RoleSelectProps {
  value: RoleSelectValue;
  onChange: (role: RoleSelectValue) => void;
  triggerClassName?: string;
  showNoAccess?: boolean;
}

const LABELS: Record<RoleSelectValue, string> = {
  ...PROJECT_ROLE_LABELS,
  none: 'Kein Zugriff',
};

const DESCRIPTIONS: Record<RoleSelectValue, string> = {
  ...PROJECT_ROLE_DESCRIPTIONS,
  none: 'Sieht und nutzt dieses Projekt nicht',
};

function RoleItem({ role }: Readonly<{ role: RoleSelectValue }>) {
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
        <span className="text-sm leading-none">{LABELS[role]}</span>
      </SelectPrimitive.ItemText>
      <span className="text-xs leading-snug text-muted-foreground">
        {DESCRIPTIONS[role]}
      </span>
    </SelectPrimitive.Item>
  );
}

export function RoleSelect({
  value,
  onChange,
  triggerClassName = 'w-40 shrink-0',
  showNoAccess = false,
}: Readonly<RoleSelectProps>) {
  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as RoleSelectValue)}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {PROJECT_ROLE_ORDER.map((role) => (
          <RoleItem key={role} role={role} />
        ))}
        {showNoAccess && (
          <>
            <SelectSeparator />
            <RoleItem role="none" />
          </>
        )}
      </SelectContent>
    </Select>
  );
}
