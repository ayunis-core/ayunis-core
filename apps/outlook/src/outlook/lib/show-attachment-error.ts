import { toast } from '@ayunis/ui/lib/toast';

export function showAttachmentError(error: Error): void {
  toast.error(error.message, {
    position: 'bottom-center',
    closeButton: true,
  });
}
