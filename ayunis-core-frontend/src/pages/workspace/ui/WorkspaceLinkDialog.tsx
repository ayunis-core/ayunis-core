import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import {
  LinkPicker,
  useLinkableSections,
  useLinkItems,
  type LinkKind,
} from '@/features/workspace-links';
import type { Workspace } from '@/features/workspaces';
import { linkCopyKey } from './workspace-link-copy';

export function WorkspaceLinkDialog({
  kind,
  workspace,
  open,
  onOpenChange,
}: Readonly<{
  kind: LinkKind;
  workspace: Pick<Workspace, 'id' | 'name'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const { t } = useTranslation('workspace');
  const copy = linkCopyKey(kind);
  const { sections, isLoading } = useLinkableSections(kind, workspace.id, open);
  const link = useLinkItems(kind, workspace.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[640px]"
        data-testid="workspace-link-dialog"
      >
        <DialogHeader>
          <DialogTitle>{t(`${copy}.dialogTitle`)}</DialogTitle>
          <DialogDescription>
            {t(`${copy}.dialogDescription`, { workspace: workspace.name })}
          </DialogDescription>
        </DialogHeader>
        <LinkPicker
          sections={sections}
          isLoading={isLoading}
          isLinking={link.isPending}
          searchLabel={t(`${copy}.search`)}
          allLinkedDescription={t(`${copy}.allLinked`)}
          onCancel={() => onOpenChange(false)}
          onLink={(ids) =>
            link.mutate(ids, { onSuccess: () => onOpenChange(false) })
          }
        />
      </DialogContent>
    </Dialog>
  );
}
