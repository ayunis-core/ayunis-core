import { useState, type KeyboardEvent } from 'react';
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
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (ids: string[]) => Promise<void> | void;
}

export function AddWorkspaceItemsDialog({
  open,
  title,
  description,
  items,
  isLoading = false,
  onOpenChange,
  onConfirm,
}: Readonly<AddWorkspaceItemsDialogProps>) {
  const { t } = useTranslation('workspace');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const availableItems = items.filter((item) => !item.isAttached);
  const availableIds = new Set(availableItems.map((item) => item.id));
  const selectedAvailableIds = selectedIds.filter((id) => availableIds.has(id));

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
    setIsSubmitting(true);
    try {
      await onConfirm(selectedAvailableIds);
      setSelectedIds([]);
      onOpenChange(false);
    } catch {
      // Mutation-level error handlers already show the user-facing toast.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="workspace-add-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto py-2">
          <DialogItemsContent
            isLoading={isLoading}
            availableItems={availableItems}
            selectedIds={selectedAvailableIds}
            onToggle={toggle}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('context.addDialog.cancel')}
          </Button>
          <Button
            data-testid="workspace-add-dialog-confirm"
            onClick={() => void handleConfirm()}
            disabled={
              isLoading || isSubmitting || selectedAvailableIds.length === 0
            }
          >
            {t('context.addDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogItemsContent({
  isLoading,
  availableItems,
  selectedIds,
  onToggle,
}: Readonly<{
  isLoading: boolean;
  availableItems: WorkspaceSelectableItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}>) {
  const { t } = useTranslation('workspace');
  if (isLoading) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t('context.addDialog.loading')}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  if (availableItems.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t('context.addDialog.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('context.addDialog.empty')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ItemGroup className="gap-2">
      {availableItems.map((item) => (
        <SelectableDialogItem
          key={item.id}
          item={item}
          checked={selectedIds.includes(item.id)}
          onToggle={() => onToggle(item.id)}
        />
      ))}
    </ItemGroup>
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
    <Item
      variant="outline"
      role="checkbox"
      tabIndex={0}
      aria-checked={checked}
      data-testid={`workspace-add-dialog-item-${item.id}`}
      onClick={onToggle}
      onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onToggle();
      }}
    >
      <ItemMedia>
        <Checkbox checked={checked} tabIndex={-1} aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{item.name}</ItemTitle>
        {item.description && (
          <ItemDescription>{item.description}</ItemDescription>
        )}
        {item.meta && <ItemDescription>{item.meta}</ItemDescription>}
      </ItemContent>
    </Item>
  );
}
