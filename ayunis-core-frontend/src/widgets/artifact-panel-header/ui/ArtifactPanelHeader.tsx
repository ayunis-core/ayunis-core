import type { ReactNode } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';

interface ArtifactPanelHeaderProps {
  readonly title: ReactNode;
  readonly actions?: ReactNode;
  readonly onBack?: () => void;
  readonly onClose: () => void;
  readonly showClose?: boolean;
}

export function ArtifactPanelHeader({
  title,
  actions,
  onBack,
  onClose,
  showClose = true,
}: Readonly<ArtifactPanelHeaderProps>) {
  const { t } = useTranslation('artifacts');
  return (
    <div className="flex items-center justify-between border-b px-3 py-2">
      <div className="flex min-w-0 items-center gap-1">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            data-testid="artifact-side-panel-back"
            onClick={onBack}
            aria-label={t('navigation.back')}
          >
            <ArrowLeft className="size-4" />
          </Button>
        )}
        {title}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {actions}
        {showClose && (
          <Button
            variant="ghost"
            size="icon"
            data-testid="artifact-side-panel-close"
            onClick={onClose}
            aria-label={t('navigation.close')}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
