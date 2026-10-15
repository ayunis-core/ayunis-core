import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@ayunis/ui/components/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@ayunis/ui/components/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Label } from '@ayunis/ui/components/label';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import type { Workspace } from '@/features/workspaces';
import type { OwnershipCandidateDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useOwnershipCandidates } from '@/widgets/workspace-settings-dialog/api/useOwnershipCandidates';
import { useTransferWorkspaceOwnership } from '@/widgets/workspace-settings-dialog/api/useTransferWorkspaceOwnership';
import { LoadErrorAlert } from '@/shared/ui/load-error-alert/LoadErrorAlert';

function OwnerField({
  candidates,
  value,
  onChange,
}: Readonly<{
  candidates: OwnershipCandidateDto[];
  value: OwnershipCandidateDto | null;
  onChange: (person: OwnershipCandidateDto | null) => void;
}>) {
  const { t } = useTranslation('workspaces');
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="grid gap-2">
      <Label htmlFor="workspace-transfer-owner">
        {t('transferDialog.label')}
      </Label>
      <Combobox
        items={candidates}
        value={value}
        onValueChange={onChange}
        itemToStringLabel={(person: OwnershipCandidateDto) => person.name}
        isItemEqualToValue={(a: OwnershipCandidateDto, b) => a.id === b.id}
      >
        <ComboboxInput
          id="workspace-transfer-owner"
          placeholder={t('transferDialog.placeholder')}
          data-testid="workspace-transfer-owner"
        />
        <ComboboxContent container={containerRef}>
          <ComboboxEmpty>{t('transferDialog.noMatch')}</ComboboxEmpty>
          <ComboboxList>
            {(person: OwnershipCandidateDto) => (
              <ComboboxItem
                key={person.id}
                value={person}
                data-testid={`workspace-transfer-option-${person.id}`}
              >
                <span className="flex flex-col items-start gap-0.5">
                  <span>{person.name}</span>
                  {person.affiliation && (
                    <span className="text-xs text-muted-foreground">
                      {person.affiliation}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <p className="text-xs text-muted-foreground">
        {t('transferDialog.hint')}
      </p>
    </div>
  );
}

export function WorkspaceTransferDialog({
  workspace,
  open,
  onOpenChange,
}: Readonly<{
  workspace: Workspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { t } = useTranslation('workspaces');
  const [selected, setSelected] = useState<OwnershipCandidateDto | null>(null);
  const { candidates, isLoading, isError, retry } = useOwnershipCandidates(
    workspace.id,
    open,
  );
  const { transfer, isTransferring } = useTransferWorkspaceOwnership(
    workspace,
    () => handleOpenChange(false),
  );
  const hasCandidates = candidates.length > 0;

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setSelected(null);
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid="workspace-transfer-dialog">
        <DialogHeader>
          <DialogTitle>{t('transferDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('transferDialog.description', { name: workspace.name })}
            {!isLoading &&
              !isError &&
              !hasCandidates &&
              ` ${t('transferDialog.noCandidates')}`}
          </DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className="h-9 w-full" />}
        {isError && (
          <LoadErrorAlert
            message={t('transferDialog.loadError')}
            retryLabel={t('transferDialog.retry')}
            testId="workspace-transfer-load-error"
            onRetry={retry}
          />
        )}
        {hasCandidates && (
          <OwnerField
            candidates={candidates}
            value={selected}
            onChange={setSelected}
          />
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isTransferring}
          >
            {t('transferDialog.cancel')}
          </Button>
          <Button
            disabled={!selected || isTransferring}
            onClick={() => selected && transfer(selected)}
            data-testid="workspace-transfer-confirm"
          >
            {t('transferDialog.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
