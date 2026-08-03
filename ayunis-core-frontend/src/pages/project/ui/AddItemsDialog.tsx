import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/shared/ui/shadcn/dialog';
import { Button } from '@/shared/ui/shadcn/button';
import { Checkbox } from '@/shared/ui/shadcn/checkbox';
import { ScrollArea } from '@/shared/ui/shadcn/scroll-area';

export interface AddableItem {
  id: string;
  name: string;
  meta?: string;
}

interface AddItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: AddableItem[];
  addedIds: string[];
  onConfirm: (ids: string[]) => void;
}

export function AddItemsDialog({
  open,
  onOpenChange,
  title,
  items,
  addedIds,
  onConfirm,
}: Readonly<AddItemsDialogProps>) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  }

  function handleConfirm() {
    onConfirm(selected);
    setSelected([]);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setSelected([]);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-72">
          <div className="flex flex-col gap-1 pr-2">
            {items.map((item) => {
              const added = addedIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent has-[:disabled]:opacity-50 has-[:disabled]:hover:bg-transparent"
                >
                  <Checkbox
                    checked={added || selected.includes(item.id)}
                    disabled={added}
                    onCheckedChange={() => toggle(item.id)}
                  />
                  <span className="flex-1">{item.name}</span>
                  {item.meta && (
                    <span className="text-xs text-muted-foreground">
                      {item.meta}
                    </span>
                  )}
                  {added && (
                    <span className="text-xs text-muted-foreground">
                      hinzugefügt
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={selected.length === 0}>
            Hinzufügen{selected.length > 0 ? ` (${selected.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
