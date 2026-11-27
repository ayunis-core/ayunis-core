import { useCallback, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Button } from '@ayunis/ui/components/button';

export interface ConfirmRequest {
  readonly title: string;
  readonly description: string;
  readonly confirmText: string;
  readonly cancelText: string;
  readonly destructive?: boolean;
  readonly onConfirm: () => void;
}

/**
 * Asks before an action. The content stays mounted while the dialog closes,
 * so Radix can finish its cleanup of the page's pointer events.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest>();
  const [open, setOpen] = useState(false);
  const confirm = useCallback((next: ConfirmRequest) => {
    setRequest(next);
    setOpen(true);
  }, []);
  const dialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      {request && (
        <ConfirmDialogContent request={request} onDone={() => setOpen(false)} />
      )}
    </Dialog>
  );
  return { confirm, dialog };
}

function ConfirmDialogContent({
  request,
  onDone,
}: Readonly<{ request: ConfirmRequest; onDone: () => void }>) {
  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{request.title}</DialogTitle>
        <DialogDescription>{request.description}</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onDone}
          data-testid="confirmation-cancel"
        >
          {request.cancelText}
        </Button>
        <Button
          variant={request.destructive ? 'destructive' : 'default'}
          onClick={() => {
            request.onConfirm();
            onDone();
          }}
          data-testid="confirmation-confirm"
        >
          {request.confirmText}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
