import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from '@ayunis/ui/components/card';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import CreateSubscriptionDialog from './CreateSubscriptionDialog';

interface NoSubscriptionSectionProps {
  orgId: string;
  readOnly?: boolean;
}

export default function NoSubscriptionSection({
  orgId,
  readOnly = false,
}: Readonly<NoSubscriptionSectionProps>) {
  const { t } = useTranslation('super-admin-settings-org');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('noSubscription.title')}</CardTitle>
        {!readOnly && (
          <CardAction>
            <CreateSubscriptionDialog
              orgId={orgId}
              trigger={
                <Button>{t('noSubscription.createSubscription')}</Button>
              }
            />
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{t('noSubscription.description')}</CardContent>
    </Card>
  );
}
