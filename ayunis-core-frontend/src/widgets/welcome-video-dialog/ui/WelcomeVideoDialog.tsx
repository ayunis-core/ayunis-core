import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Button } from '@ayunis/ui/components/button';
import { useWelcomeVideo } from '../api/useWelcomeVideo';

const WELCOME_VIDEO_URL = '/videos/welcome-v1.mp4';

export default function WelcomeVideoDialog() {
  const { t } = useTranslation('welcome-video');
  const navigate = useNavigate();
  const { seen, isLoading, isSaving, markSeen } = useWelcomeVideo();
  const [dismissed, setDismissed] = useState(false);
  const open = !isLoading && !seen && !dismissed;

  const dismiss = async (): Promise<boolean> => {
    if (isSaving) return false;

    try {
      await markSeen();
      setDismissed(true);
      return true;
    } catch {
      return false;
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      void dismiss();
    }
  };

  const handleGoToChat = async () => {
    if (await dismiss()) {
      void navigate({ to: '/chat' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        closeLabel={t('close')}
        showCloseButton={!isSaving}
        aria-busy={isSaving}
      >
        <div
          className="grid max-h-[calc(90vh-2rem)] gap-4 overflow-y-auto"
          data-slot="welcome-video-dialog-body"
        >
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              <span className="whitespace-pre-line">{t('description')}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full overflow-hidden rounded-lg border bg-muted">
            <video
              src={WELCOME_VIDEO_URL}
              title={t('title')}
              aria-label={t('title')}
              className="h-full w-full object-contain"
              controls
              playsInline
              preload="metadata"
            >
              <track
                default
                kind="captions"
                src="/videos/welcome-v1.de.vtt"
                srcLang="de"
                label="Deutsch"
              />
            </video>
          </div>
          <DialogFooter>
            <Button disabled={isSaving} onClick={() => void handleGoToChat()}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {t('dismiss')}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
