import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Button } from '@/shared/ui/shadcn/button';
import { useTranslation } from 'react-i18next';
import CreateTrialDialog from './CreateTrialDialog';

interface NoTrialSectionProps {
  orgId: string;
}

export default function NoTrialSection({ orgId }: NoTrialSectionProps) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('noTrial.title')}</CardTitle>
        <CardAction>
          <CreateTrialDialog
            orgId={orgId}
            trigger={<Button>{t('noTrial.createTrial')}</Button>}
          />
        </CardAction>
      </CardHeader>
      <CardContent>{t('noTrial.description')}</CardContent>
    </Card>
  );
}
