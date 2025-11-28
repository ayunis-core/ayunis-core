import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/shared/ui/shadcn/card';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import CreateSubscriptionDialog from './CreateSubscriptionDialog';

interface NoSubscriptionSectionProps {
  orgId: string;
}

export default function NoSubscriptionSection({
  orgId,
}: NoSubscriptionSectionProps) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('noSubscription.title')}</CardTitle>
        <CardAction>
          <CreateSubscriptionDialog
            orgId={orgId}
            trigger={<Button>{t('noSubscription.createSubscription')}</Button>}
          />
        </CardAction>
      </CardHeader>
      <CardContent>{t('noSubscription.description')}</CardContent>
    </Card>
  );
}
