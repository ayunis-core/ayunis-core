import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  AdventCalendarMediaType,
  type AdventCalendarDoorContentResponseDto,
} from '@ayunis/api-client/schemas';
import { Markdown } from '@/widgets/markdown';
import { VimeoEmbed } from '@/shared/ui/vimeo-embed';
import { adventDoorImageUrl } from '@/features/advent-calendar';
import { AdventCalendarDoorActions } from './AdventCalendarDoorActions';

interface OpenDoor {
  day: number;
  content: AdventCalendarDoorContentResponseDto;
}

interface AdventCalendarDoorDialogProps {
  door: OpenDoor | null;
  onClose: () => void;
}

export function AdventCalendarDoorDialog({
  door,
  onClose,
}: Readonly<AdventCalendarDoorDialogProps>) {
  return (
    <Dialog
      open={door !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {door && <DoorDialogContent day={door.day} content={door.content} />}
    </Dialog>
  );
}

function DoorDialogContent({ day, content }: Readonly<OpenDoor>) {
  const { t } = useTranslation('advent-calendar');
  return (
    <DialogContent
      size="wide"
      data-testid="advent-calendar-door-dialog"
      data-day={day}
    >
      {/* Scrolls inside the dialog, not the dialog itself, so its close button
          stays in view. 2rem is the dialog's vertical padding. */}
      <div className="grid max-h-[calc(90vh-2rem)] gap-4 overflow-y-auto">
        <DialogHeader>
          <DialogDescription>{t('dialog.kicker', { day })}</DialogDescription>
          <DialogTitle data-testid="advent-calendar-door-title">
            {content.title}
          </DialogTitle>
        </DialogHeader>
        <DoorMedia day={day} content={content} />
        {content.body && (
          <Markdown renderImages={false} className="text-sm">
            {content.body}
          </Markdown>
        )}
        <AdventCalendarDoorActions buttons={content.buttons} />
      </div>
    </DialogContent>
  );
}

function DoorMedia({ day, content }: Readonly<OpenDoor>) {
  const { media, title } = content;
  if (media?.type === AdventCalendarMediaType.image) {
    return (
      <img
        src={adventDoorImageUrl(day, content.updatedAt)}
        alt={title}
        className="w-full rounded-lg border"
        data-testid="advent-calendar-door-image"
      />
    );
  }
  if (media?.type === AdventCalendarMediaType.vimeo && media.vimeoVideoId) {
    return (
      <VimeoEmbed
        videoId={media.vimeoVideoId}
        hash={media.vimeoHash}
        title={title}
        data-testid="advent-calendar-door-vimeo"
      />
    );
  }
  return null;
}
