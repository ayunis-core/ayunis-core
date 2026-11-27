import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { useMarkReleaseNoteRead } from '@/features/release-notes';
import {
  ReleaseNoteChatStarter,
  ReleaseNoteContent,
  ReleaseNoteKicker,
} from '@/widgets/release-note-content';
import {
  useReleaseNoteAnnouncement,
  type ReleaseNoteAnnouncement,
} from '@/widgets/release-note-announcement/api/useReleaseNoteAnnouncement';

/**
 * Opens the product update Announcable wants seen right away, once. It is
 * read as soon as it is shown, so it never opens again, on no device.
 */
export function ReleaseNoteAnnouncementDialog() {
  const { t } = useTranslation('release-notes');
  const announcement = useReleaseNoteAnnouncement();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [shown, setShown] = useState<{
    announcement: ReleaseNoteAnnouncement;
    pathname: string;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const { mutate: markRead } = useMarkReleaseNoteRead();

  if (announcement && !shown) {
    setShown({ announcement, pathname });
    setOpen(true);
  }
  // Starting a chat about the update navigates to the chat.
  if (open && shown && pathname !== shown.pathname) setOpen(false);

  const shownId = shown?.announcement.releaseNote.id;
  useEffect(() => {
    if (shownId) markRead(shownId);
  }, [shownId, markRead]);

  if (!shown) return null;
  const { releaseNote, chatStarterDefaults } = shown.announcement;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        size="wide"
        closeLabel={t('announcement.close')}
        data-testid="release-note-announcement"
      >
        {/* The composer stays outside the scrolling update: it focuses itself,
            which would otherwise scroll the update out of view. */}
        <div className="flex max-h-[calc(90vh-2rem)] flex-col gap-4">
          <DialogHeader>
            <DialogDescription>
              <ReleaseNoteKicker date={releaseNote.date} />
            </DialogDescription>
            <DialogTitle data-testid="release-note-announcement-headline">
              {releaseNote.headline}
            </DialogTitle>
          </DialogHeader>
          <div className="flex min-h-0 flex-col gap-6 overflow-y-auto">
            <ReleaseNoteContent releaseNote={releaseNote} />
          </div>
          <ReleaseNoteChatStarter
            releaseNoteId={releaseNote.id}
            selectedModelId={chatStarterDefaults.selectedModelId}
            isEmbeddingModelEnabled={
              chatStarterDefaults.isEmbeddingModelEnabled
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
