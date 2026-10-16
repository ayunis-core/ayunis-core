import { useState } from 'react';
import { Forward } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ayunis/ui/components/dialog';
import { Label } from '@ayunis/ui/components/label';
import { useHandoverTargets } from '@/features/resource-handover/api/useHandoverQueries';
import { useCreateHandover } from '@/features/resource-handover/api/useHandoverActions';
import {
  dialogDescription,
  dialogHint,
  groupTargets,
  orderedTargets,
  targetValue,
} from '@/features/resource-handover/lib/handover-copy';
import { useHandoverCopy } from '@/features/resource-handover/model/useHandoverCopy';
import type {
  HandoverItem,
  HandoverKind,
  HandoverTarget,
} from '@/features/resource-handover/model/types';
import { HandoverTargetSelect } from './HandoverTargetSelect';

interface HandoverDialogProps {
  kind: HandoverKind;
  item: HandoverItem;
  targets: HandoverTarget[];
  orgEditorsIncludeNonAdmins: boolean;
  unlinksResources: boolean;
  onClose: () => void;
}

function HandoverDialogContent({
  kind,
  item,
  targets,
  orgEditorsIncludeNonAdmins,
  unlinksResources,
  onClose,
}: Readonly<HandoverDialogProps>) {
  const { t, text } = useHandoverCopy(kind);
  const groups = groupTargets(targets);
  const ordered = orderedTargets(groups);
  const [value, setValue] = useState(targetValue(ordered[0]));
  const target =
    ordered.find((candidate) => targetValue(candidate) === value) ?? ordered[0];
  const create = useCreateHandover(kind, item);
  const hint = dialogHint(target, {
    targets,
    orgEditorsIncludeNonAdmins,
    unlinksResources,
  });

  return (
    <DialogContent data-testid="handover-dialog">
      <DialogHeader>
        <DialogTitle>{t(`dialog.title.${kind}`)}</DialogTitle>
        <DialogDescription>{text(dialogDescription(target))}</DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="handover-target">{t('dialog.targetLabel')}</Label>
        <HandoverTargetSelect
          kind={kind}
          groups={groups}
          value={targetValue(target)}
          onChange={setValue}
        />
        <p className="text-xs text-muted-foreground">
          {hint.map((sentence) => text(sentence)).join(' ')}
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          {t('dialog.cancel')}
        </Button>
        <Button
          disabled={create.isPending}
          onClick={() => create.mutate(target, { onSuccess: onClose })}
          data-testid="handover-submit"
        >
          {target.appliesImmediately
            ? t('dialog.submitDirect')
            : t('dialog.submitRequest')}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export function HandoverButton({
  kind,
  item,
  unlinksResources = false,
}: Readonly<{
  kind: HandoverKind;
  item: HandoverItem;
  unlinksResources?: boolean;
}>) {
  const { t } = useHandoverCopy(kind);
  const { targets, orgEditorsIncludeNonAdmins } = useHandoverTargets(
    kind,
    true,
  );
  const [open, setOpen] = useState(false);
  if (targets.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" data-testid="handover-open">
          <Forward />
          {t('action')}
        </Button>
      </DialogTrigger>
      {open && (
        <HandoverDialogContent
          kind={kind}
          item={item}
          targets={targets}
          orgEditorsIncludeNonAdmins={orgEditorsIncludeNonAdmins}
          unlinksResources={unlinksResources}
          onClose={() => setOpen(false)}
        />
      )}
    </Dialog>
  );
}
