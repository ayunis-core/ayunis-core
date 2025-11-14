import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { useTranslation } from 'react-i18next';

export default function NoTrialSection() {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('noTrial.title')}</CardTitle>
      </CardHeader>
      <CardContent>{t('noTrial.description')}</CardContent>
    </Card>
  );
}
