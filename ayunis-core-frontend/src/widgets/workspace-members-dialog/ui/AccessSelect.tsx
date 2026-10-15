import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  WORKSPACE_GRANT_LEVELS,
  type WorkspaceGrantLevel,
} from '@/features/workspaces';

export function AccessSelect({
  value,
  onChange,
  ariaLabel,
  className,
  disabled = false,
  testId,
}: Readonly<{
  value: WorkspaceGrantLevel;
  onChange: (level: WorkspaceGrantLevel) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  testId?: string;
}>) {
  const { t } = useTranslation('workspace-sharing');

  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => onChange(next as WorkspaceGrantLevel)}
    >
      <SelectTrigger
        className={className}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        <SelectValue>{t(`levels.${value}`)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-w-72">
        {WORKSPACE_GRANT_LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            <span className="flex flex-col items-start gap-0.5">
              <span>{t(`levels.${level}`)}</span>
              <span className="text-xs text-muted-foreground">
                {t(`levelDescriptions.${level}`)}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
