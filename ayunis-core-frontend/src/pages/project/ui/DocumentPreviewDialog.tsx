import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import type { ProjectDocument } from '@/entities/project';
import { MockWidgetView } from './MockWidgetView';

interface DocumentPreviewDialogProps {
  document: ProjectDocument | null;
  onClose: () => void;
}

export function DocumentPreviewDialog({
  document,
  onClose,
}: Readonly<DocumentPreviewDialogProps>) {
  return (
    <Dialog
      open={document !== null}
      onOpenChange={(next) => !next && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[85vh] min-h-96 grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-3xl"
      >
        <DialogHeader className="flex h-14 shrink-0 flex-row items-center gap-1 px-3">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm font-medium">
            Erstellte Inhalte
          </DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Schließen">
              <X />
            </Button>
          </DialogClose>
        </DialogHeader>
        <div className="min-h-0">
          {document && <MockWidgetView document={document} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
