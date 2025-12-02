import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { useConfirmationContext } from '../model/useConfirmationContext';
import { useState } from 'react';

export default function ConfirmationModal() {
  const { isOpen, options, hideConfirmation } = useConfirmationContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!options) return;
    try {
      setIsLoading(true);
      await options.onConfirm();
      hideConfirmation();
    } catch (error) {
      console.error('Error in confirmation callback:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    hideConfirmation();
  };

  const isDangerous = options?.variant === 'destructive';

  // Important: Dialog must always be rendered (not conditionally returned) so it receives
  // the open={false} transition. Without this, Radix UI won't clean up its Portal and
  // overlay, leaving an invisible layer that blocks all pointer events.
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      {options && (
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{options.title}</DialogTitle>
            <DialogDescription>{options.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
              {options.cancelText || 'Cancel'}
            </Button>
            <Button
              variant={isDangerous ? 'destructive' : 'default'}
              onClick={() => void handleConfirm()}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : options.confirmText || 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
