import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import NewChatPageLayout from './NewChatPageLayout';
import { Button } from '@ayunis/ui/components/button';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';

export default function NewChatPageNoModelError() {
  const { t } = useTranslation('chat');

  return (
    <NewChatPageLayout
      header={<ContentAreaHeader breadcrumbs={[{ label: 'New Chat' }]} />}
    >
      <Card className="text-center">
        <CardHeader>
          <CardTitle>{t('newChat.noModelTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="">{t('newChat.noModelDescription')}</p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link to="/admin-settings/models">
            <Button>{t('newChat.configureModel')}</Button>
          </Link>
        </CardFooter>
      </Card>
    </NewChatPageLayout>
  );
}
