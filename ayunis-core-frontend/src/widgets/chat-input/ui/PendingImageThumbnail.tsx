import { Button } from '@/shared/ui/shadcn/button';
import { XIcon } from 'lucide-react';
import type { PendingImage } from '../hooks/usePendingImages';

interface PendingImageThumbnailProps {
  image: PendingImage;
  onRemove: (imageId: string) => void;
}

export function PendingImageThumbnail({
  image,
  onRemove,
}: Readonly<PendingImageThumbnailProps>) {
  return (
    <div className="relative inline-block rounded-lg overflow-hidden border border-border">
      <img
        src={image.preview}
        alt={image.file.name}
        className="h-14.5 w-14.5 object-cover"
      />
      <Button
        size="icon"
        className="absolute top-1 right-1 h-4 w-4 rounded-full"
        onClick={() => onRemove(image.id)}
      >
        <XIcon className="size-3" />
      </Button>
    </div>
  );
}
