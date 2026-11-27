import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';
import { NewChatBackdrop } from '@ayunis/chat/new-chat';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import AppLayout from '@/layouts/app-layout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';

export default function NewChatPageNoModelError() {
  const { t } = useTranslation('chat');

  return (
    <AppLayout>
      <div className="absolute inset-0 overflow-hidden">
        <NewChatBackdrop />
        <div className="absolute inset-0 z-[1] flex min-h-0 flex-col">
          <div className="sticky top-0 z-10 mb-1.5 w-full shrink-0 bg-background px-3 pt-2">
            <ContentAreaHeader breadcrumbs={[{ label: 'New Chat' }]} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-2 pb-2 sm:px-4 sm:pb-4">
            <div className="w-full max-w-[800px]">
              <Card className="text-center" data-testid="new-chat-no-model">
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
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
