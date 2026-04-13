import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/shadcn/dialog';

interface ImagePreviewProps {
  readonly src: string;
  readonly alt?: string;
  /** When true, renders as a small fixed-size thumbnail (for user-uploaded images). Otherwise renders at max-w-md (for generated images). */
  readonly compact?: boolean;
}

export default function ImagePreview({
  src,
  alt = 'Image preview',
  compact = false,
}: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        className={
          compact
            ? 'rounded-lg h-14.5 w-14.5 overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity'
            : 'my-2 max-w-md overflow-hidden rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity'
        }
        onClick={() => setIsOpen(true)}
      >
        <img
          src={src}
          alt={alt}
          className={
            compact ? 'w-full h-full object-cover' : 'w-full object-contain'
          }
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <img
            src={src}
            alt={alt}
            className="w-full h-full max-h-[90vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
