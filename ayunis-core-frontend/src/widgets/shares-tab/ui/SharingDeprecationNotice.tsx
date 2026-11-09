import { TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';

export function SharingDeprecationNotice({
  translationNs,
}: Readonly<{ translationNs: string }>) {
  const { t } = useTranslation(translationNs);

  return (
    <Alert variant="warning" data-testid="shares-deprecation-notice">
      <TriangleAlert />
      <AlertTitle>{t('shares.deprecation.notice.title')}</AlertTitle>
      <AlertDescription>
        {t('shares.deprecation.notice.description')}
      </AlertDescription>
    </Alert>
  );
}
