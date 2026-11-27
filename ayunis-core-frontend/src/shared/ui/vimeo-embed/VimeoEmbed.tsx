import { cn } from '@ayunis/ui/lib/cn';
import { vimeoEmbedUrl } from './vimeo-embed-url';

interface VimeoEmbedProps {
  videoId: string;
  /** The privacy hash of an unlisted video. */
  hash?: string | null;
  title: string;
  className?: string;
  'data-testid'?: string;
}

export function VimeoEmbed({
  videoId,
  hash,
  title,
  className,
  'data-testid': testId,
}: Readonly<VimeoEmbedProps>) {
  return (
    <iframe
      src={vimeoEmbedUrl(videoId, hash)}
      title={title}
      className={cn('aspect-video w-full rounded-lg border-0', className)}
      allow="autoplay; fullscreen; picture-in-picture"
      allowFullScreen
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
      data-testid={testId}
    />
  );
}
