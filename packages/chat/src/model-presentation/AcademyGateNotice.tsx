import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';

export function AcademyGateNotice({
  className,
  onOpenAcademy,
}: Readonly<{
  className?: string;
  onOpenAcademy?: () => void;
}>) {
  const { t } = useTranslation('academy');
  return (
    <Alert variant="warning" className={className}>
      <Lock />
      <AlertTitle>{t('gate.title')}</AlertTitle>
      <AlertDescription>
        {t('gate.description')}
        {onOpenAcademy && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenAcademy}
            className="mt-2"
          >
            {t('gate.action')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
