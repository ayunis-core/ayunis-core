import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';

export function PaneAcademyNotice() {
  const { t } = useTranslation('academy');
  return (
    <Alert variant="warning" className="mb-2">
      <Lock />
      <AlertTitle>{t('gate.title')}</AlertTitle>
      <AlertDescription>{t('gate.description')}</AlertDescription>
    </Alert>
  );
}
