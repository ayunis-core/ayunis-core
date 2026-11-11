import { CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@ayunis/ui/lib/cn';
import type { ModuleProgress } from '@/features/academy';

interface ModuleProgressStatusProps {
  moduleProgress: ModuleProgress;
  className?: string;
}

export function ModuleProgressStatus({
  moduleProgress,
  className,
}: Readonly<ModuleProgressStatusProps>) {
  const { t } = useTranslation('academy');

  if (moduleProgress.state !== 'complete') return null;

  return (
    <CheckCircle2
      className={cn('size-4 shrink-0 text-green-600', className)}
      aria-label={t('moduleProgress.complete')}
      data-testid={`academy-module-complete-${moduleProgress.courseModule.id}`}
    />
  );
}
