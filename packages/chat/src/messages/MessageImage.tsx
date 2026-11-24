import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { useState } from 'react';

export function MessageImage({
  altText,
  imageUrl,
}: {
  readonly altText?: string;
  readonly imageUrl?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-lg h-14.5 w-14.5 my-2 overflow-hidden border border-border cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => setIsOpen(true)}
      >
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-cover"
        />
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">
            {altText ?? 'Image preview'}
          </DialogTitle>
          <img
            src={imageUrl}
            alt={altText}
            className="w-full h-full max-h-[90vh] object-contain rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
