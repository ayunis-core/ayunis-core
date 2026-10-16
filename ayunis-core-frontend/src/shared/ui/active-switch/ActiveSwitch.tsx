import { Switch } from '@ayunis/ui/components/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';

export function ActiveSwitch({
  checked,
  onCheckedChange,
  label,
  tooltip,
  disabled = false,
  testId,
}: Readonly<{
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  tooltip: string;
  disabled?: boolean;
  testId?: string;
}>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            onClick={(event) => event.stopPropagation()}
            disabled={disabled}
            aria-label={label}
            data-testid={testId}
          />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
