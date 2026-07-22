import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { useWelcomeVideo } from '../api/useWelcomeVideo';
import { toLoomEmbedUrl } from '../lib/toLoomEmbedUrl';

const WELCOME_VIDEO_URL =
  'https://www.loom.com/embed/374b600483384e5183ce228a3fa56238';

const LOOM_EMBED_PARAMS =
  'hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true';

interface WelcomeVideoDialogProps {
  videoUrl?: string;
}

export default function WelcomeVideoDialog({
  videoUrl = WELCOME_VIDEO_URL,
}: Readonly<WelcomeVideoDialogProps>) {
  const { t } = useTranslation('welcome-video');
  const { seen, isLoading, markSeen } = useWelcomeVideo();
  const [dismissed, setDismissed] = useState(false);
  const open = !isLoading && !seen && !dismissed;

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setDismissed(true);
      markSeen();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl" closeLabel={t('close')}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {t('description')}
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
          {videoUrl ? (
            <iframe
              src={`${toLoomEmbedUrl(videoUrl)}?${LOOM_EMBED_PARAMS}`}
              title={t('title')}
              className="h-full w-full"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <PlayCircle className="h-10 w-10" />
              <span className="text-sm">{t('videoPlaceholder')}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => handleOpenChange(false)}>
            {t('dismiss')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
