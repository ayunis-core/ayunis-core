import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import NewChatPageLayout from './NewChatPageLayout';
import { EmbeddedHistoryButton } from './EmbeddedNewChat';
import { Button } from '@ayunis/ui/components/button';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';

export default function NewChatPageNoModelError() {
  const { t } = useTranslation('chat');
  // The Outlook pane can't open the admin settings; its history page is the
  // way out, since sign-out lives there.
  const isEmbedded = useEmbedded();

  return (
    <NewChatPageLayout
      header={
        <ContentAreaHeader
          breadcrumbs={[{ label: 'New Chat' }]}
          action={isEmbedded ? <EmbeddedHistoryButton /> : undefined}
        />
      }
    >
      <Card className="text-center" data-testid="new-chat-no-model">
        <CardHeader>
          <CardTitle>{t('newChat.noModelTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="">{t('newChat.noModelDescription')}</p>
        </CardContent>
        {!isEmbedded && (
          <CardFooter className="justify-center">
            <Link to="/admin-settings/models">
              <Button>{t('newChat.configureModel')}</Button>
            </Link>
          </CardFooter>
        )}
      </Card>
    </NewChatPageLayout>
  );
}
