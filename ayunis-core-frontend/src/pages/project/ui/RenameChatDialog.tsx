import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Input } from '@/shared/ui/shadcn/input';
import { Label } from '@/shared/ui/shadcn/label';

interface RenameChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTitle: string;
  onRename: (title: string) => void;
}

export function RenameChatDialog({
  open,
  onOpenChange,
  currentTitle,
  onRename,
}: Readonly<RenameChatDialogProps>) {
  const [title, setTitle] = useState(currentTitle);

  function handleOpenChange(next: boolean) {
    if (next) setTitle(currentTitle);
    onOpenChange(next);
  }

  function handleSave() {
    const trimmed = title.trim();
    if (trimmed.length === 0) return;
    onRename(trimmed);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Chat umbenennen</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rename-project-chat">Name</Label>
          <Input
            id="rename-project-chat"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={title.trim().length === 0}>
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
