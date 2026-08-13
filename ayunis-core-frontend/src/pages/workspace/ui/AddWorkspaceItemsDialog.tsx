import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Label } from '@ayunis/ui/components/label';

export interface WorkspaceSelectableItem {
  id: string;
  name: string;
  description?: string | null;
  meta?: string;
  isAttached: boolean;
}

interface AddWorkspaceItemsDialogProps {
  open: boolean;
  title: string;
  description: string;
  items: WorkspaceSelectableItem[];
  onOpenChange: (open: boolean) => void;
  onConfirm: (ids: string[]) => Promise<void> | void;
}

export function AddWorkspaceItemsDialog({
  open,
  title,
  description,
  items,
  onOpenChange,
  onConfirm,
}: Readonly<AddWorkspaceItemsDialogProps>) {
  const { t } = useTranslation('workspace');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const availableItems = items.filter((item) => !item.isAttached);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSelectedIds([]);
    onOpenChange(nextOpen);
  }

  async function handleConfirm() {
    await onConfirm(selectedIds);
    setSelectedIds([]);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto py-2">
          {availableItems.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t('context.addDialog.emptyTitle')}</EmptyTitle>
                <EmptyDescription>
                  {t('context.addDialog.empty')}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ItemGroup className="gap-2">
              {availableItems.map((item) => (
                <SelectableDialogItem
                  key={item.id}
                  item={item}
                  checked={selectedIds.includes(item.id)}
                  onToggle={() => toggle(item.id)}
                />
              ))}
            </ItemGroup>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('context.addDialog.cancel')}
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={selectedIds.length === 0}
          >
            {t('context.addDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SelectableDialogItem({
  item,
  checked,
  onToggle,
}: Readonly<{
  item: WorkspaceSelectableItem;
  checked: boolean;
  onToggle: () => void;
}>) {
  return (
    <Item variant="outline" asChild>
      <Label>
        <ItemMedia>
          <Checkbox checked={checked} onCheckedChange={onToggle} />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{item.name}</ItemTitle>
          {item.description && (
            <ItemDescription>{item.description}</ItemDescription>
          )}
          {item.meta && <ItemDescription>{item.meta}</ItemDescription>}
        </ItemContent>
      </Label>
    </Item>
  );
}
