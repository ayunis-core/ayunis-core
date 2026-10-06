import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  WORKSPACE_ACCESS_DESCRIPTION,
  WORKSPACE_ACCESS_LABEL,
} from '@/widgets/sharing-prototype/model/fixtures';
import type { MemberAccess } from '@/widgets/sharing-prototype/model/types';

const LEVELS: MemberAccess[] = ['use', 'edit', 'manage'];

export function WorkspaceAccessSelect({
  value,
  onChange,
  ariaLabel,
  className,
  disabled = false,
}: Readonly<{
  value: MemberAccess;
  onChange: (access: MemberAccess) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}>) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as MemberAccess)}
    >
      <SelectTrigger className={className} aria-label={ariaLabel}>
        <SelectValue>{WORKSPACE_ACCESS_LABEL[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-w-72">
        {LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            <span className="flex flex-col items-start gap-0.5">
              <span>{WORKSPACE_ACCESS_LABEL[level]}</span>
              <span className="text-xs text-muted-foreground">
                {WORKSPACE_ACCESS_DESCRIPTION[level]}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
