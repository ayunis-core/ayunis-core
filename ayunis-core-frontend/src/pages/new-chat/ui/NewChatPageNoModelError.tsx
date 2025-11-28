import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import NewChatPageLayout from './NewChatPageLayout';
import { Button } from '@/shared/ui/shadcn/button';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';

export default function NewChatPageNoModelError() {
  const { t } = useTranslation('chats');

  return (
    <NewChatPageLayout header={<ContentAreaHeader title="New Chat" />}>
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
