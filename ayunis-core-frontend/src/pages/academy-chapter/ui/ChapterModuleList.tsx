import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Progress } from '@ayunis/ui/components/progress';
import type { ChapterModuleProgress } from '@/features/academy';
import { ModuleProgressStatus } from './ModuleProgressStatus';

interface ChapterModuleListProps {
  moduleProgress: ChapterModuleProgress;
  currentIndex: number;
  onSelectModule: (index: number) => void;
}

export function ChapterModuleList({
  moduleProgress,
  currentIndex,
  onSelectModule,
}: Readonly<ChapterModuleListProps>) {
  const { t } = useTranslation('academy');
  const { modules, completedCount, totalCount } = moduleProgress;

  return (
    <nav>
      <div className="mb-3 space-y-1.5 px-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t('detail.modulesTitle')}
          </span>
          <span
            className="text-xs text-muted-foreground tabular-nums"
            data-testid="academy-module-list-count"
          >
            {t('moduleProgress.count', {
              completed: completedCount,
              total: totalCount,
            })}
          </span>
        </div>
        <Progress
          value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0}
          className="h-1"
        />
      </div>
      <ul className="space-y-1">
        {modules.map((entry) => (
          <li key={entry.courseModule.id}>
            <Button
              variant={entry.index === currentIndex ? 'secondary' : 'ghost'}
              onClick={() => onSelectModule(entry.index)}
              className="w-full justify-start gap-2 text-left"
            >
              <span className="text-muted-foreground tabular-nums">
                {entry.index + 1}
              </span>
              <span className="truncate">{entry.courseModule.title}</span>
              <ModuleProgressStatus
                moduleProgress={entry}
                className="ml-auto"
              />
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
