import { Markdown } from '@/widgets/markdown';
import { NotificationMedia } from '@/features/notifications';
import { releaseNoteImageUrl } from '@/features/release-notes';
import type { ReleaseNoteResponseDto } from '@ayunis/api-client/schemas';

/** The media and body of a product update, for its container to space. */
export function ReleaseNoteContent({
  releaseNote,
}: Readonly<{ releaseNote: ReleaseNoteResponseDto }>) {
  return (
    <>
      <NotificationMedia
        media={releaseNote.media}
        imageSrc={releaseNoteImageUrl(releaseNote.id)}
        title={releaseNote.headline}
        testIdPrefix="release-note-detail"
      />
      <Markdown renderImages={false} className="text-sm">
        {releaseNote.body}
      </Markdown>
    </>
  );
}
