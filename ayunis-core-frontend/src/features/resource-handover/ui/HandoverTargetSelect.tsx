import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import {
  targetCopy,
  targetValue,
  type TargetGroups,
} from '@/features/resource-handover/lib/handover-copy';
import { useHandoverCopy } from '@/features/resource-handover/model/useHandoverCopy';
import type {
  HandoverKind,
  HandoverTarget,
} from '@/features/resource-handover/model/types';

function TargetItems({
  kind,
  targets,
}: Readonly<{ kind: HandoverKind; targets: HandoverTarget[] }>) {
  const { text } = useHandoverCopy(kind);
  return targets.map((target) => (
    <SelectItem key={targetValue(target)} value={targetValue(target)}>
      {text(targetCopy('option', target))}
    </SelectItem>
  ));
}

function GroupedTargetItems({
  kind,
  groups,
}: Readonly<{ kind: HandoverKind; groups: TargetGroups }>) {
  const { t } = useHandoverCopy(kind);
  return (
    <>
      {groups.own.length > 0 && (
        <SelectGroup>
          <SelectLabel>{t('dialog.groups.own')}</SelectLabel>
          <TargetItems kind={kind} targets={groups.own} />
        </SelectGroup>
      )}
      <SelectGroup>
        <SelectLabel>{t('dialog.groups.other')}</SelectLabel>
        <TargetItems kind={kind} targets={groups.other} />
      </SelectGroup>
      {groups.org.length > 0 && (
        <>
          <SelectSeparator />
          <TargetItems kind={kind} targets={groups.org} />
        </>
      )}
    </>
  );
}

export function HandoverTargetSelect({
  kind,
  groups,
  value,
  onChange,
}: Readonly<{
  kind: HandoverKind;
  groups: TargetGroups;
  value: string;
  onChange: (value: string) => void;
}>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id="handover-target"
        className="w-full"
        data-testid="handover-target"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {groups.other.length > 0 ? (
          <GroupedTargetItems kind={kind} groups={groups} />
        ) : (
          <TargetItems kind={kind} targets={[...groups.own, ...groups.org]} />
        )}
      </SelectContent>
    </Select>
  );
}
