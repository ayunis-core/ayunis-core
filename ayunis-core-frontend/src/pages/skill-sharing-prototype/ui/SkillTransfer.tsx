import { useState } from 'react';
import { Clock, Forward } from 'lucide-react';
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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Label } from '@ayunis/ui/components/label';
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
import { showSuccess } from '@/shared/lib/toast';
import {
  canReviewTarget,
  findPerson,
  findTeam,
  orgMemberCount,
  targetLabel,
  targetOwnerLabel,
  teamAdminIdsWith,
  teamMemberCount,
  transferTargetsOf,
} from '@/widgets/sharing-prototype/model/access';
import {
  useHasPermission,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import {
  requestTransfer,
  transferDirectly,
  withdrawRequest,
} from '@/widgets/sharing-prototype/model/prototype-transfers';
import type {
  Person,
  OwnedItem,
  ResourceKind,
  TransferRequest,
  TransferTarget,
} from '@/widgets/sharing-prototype/model/types';
import {
  RESOURCE_NOUN,
  approveTransferRequest,
  rejectTransferRequest,
} from '@/pages/skill-sharing-prototype/lib/requests';

function targetKey(target: TransferTarget): string {
  return target.kind === 'org' ? 'org' : `team-${target.teamId}`;
}

function targetName(target: TransferTarget): string {
  return target.kind === 'org'
    ? 'Organisation'
    : `Team ${findTeam(target.teamId).name}`;
}

function teamReviewerIds(target: TransferTarget): string[] {
  return target.kind === 'team'
    ? teamAdminIdsWith(target.teamId, 'team_review_requests')
    : [];
}

function reviewerText(target: TransferTarget, isDirect: boolean): string {
  if (isDirect) return 'Sie dürfen das freigeben, die Übergabe gilt sofort.';
  const reviewers = teamReviewerIds(target);
  if (reviewers.length === 0) return 'Ein Admin prüft Ihre Anfrage.';
  return reviewers.length === 1
    ? `${findPerson(reviewers[0]).name} als Team-Admin oder ein Admin prüft Ihre Anfrage.`
    : 'Ein Team-Admin oder ein Admin prüft Ihre Anfrage.';
}

function reviewerName(target: TransferTarget): string {
  const reviewers = teamReviewerIds(target);
  if (reviewers.length === 0) return 'Ein Admin';
  return reviewers.length === 1
    ? findPerson(reviewers[0]).name
    : 'Ein Team-Admin';
}

function audienceSentence(target: TransferTarget, noun: string): string {
  return target.kind === 'org'
    ? `Alle ${orgMemberCount()} Personen in der Organisation können die ${noun} nutzen.`
    : `Alle ${teamMemberCount(target.teamId)} Mitglieder im Team können die ${noun} nutzen.`;
}

function editSentence(
  target: TransferTarget,
  noun: string,
  isDirect: boolean,
): string {
  if (isDirect) return `Danach gehört die ${noun} ${targetOwnerLabel(target)}.`;
  const editors = target.kind === 'org' ? 'Admins' : 'die Team-Admins';
  return `Danach können Sie die ${noun} nicht mehr bearbeiten, nur noch ${editors}.`;
}

function transferHint(
  target: TransferTarget,
  targets: TransferTarget[],
  noun: string,
  isDirect: boolean,
): string {
  const sentences = [
    editSentence(target, noun, isDirect),
    audienceSentence(target, noun),
  ];
  if (target.kind === 'team' && hasSeveralTeams(targets)) {
    sentences.push(
      'Sollen mehrere Teams sie nutzen, übergeben Sie sie an die Organisation.',
    );
  }
  return sentences.join(' ');
}

function hasSeveralTeams(targets: TransferTarget[]): boolean {
  return targets.filter((target) => target.kind === 'team').length > 1;
}

function TargetItems({ targets }: Readonly<{ targets: TransferTarget[] }>) {
  return targets.map((target) => (
    <SelectItem key={targetKey(target)} value={targetKey(target)}>
      {targetName(target)}
    </SelectItem>
  ));
}

function TargetOptions({
  targets,
  ownTeamIds,
}: Readonly<{ targets: TransferTarget[]; ownTeamIds: string[] }>) {
  const isOwn = (target: TransferTarget) =>
    target.kind === 'team' && ownTeamIds.includes(target.teamId);
  const own = targets.filter(isOwn);
  const others = targets.filter(
    (target) => target.kind === 'team' && !isOwn(target),
  );
  const org = targets.filter((target) => target.kind === 'org');
  if (others.length === 0) return <TargetItems targets={targets} />;
  return (
    <>
      {own.length > 0 && (
        <SelectGroup>
          <SelectLabel>Ihre Teams</SelectLabel>
          <TargetItems targets={own} />
        </SelectGroup>
      )}
      <SelectGroup>
        <SelectLabel>Andere Teams</SelectLabel>
        <TargetItems targets={others} />
      </SelectGroup>
      {org.length > 0 && (
        <>
          <SelectSeparator />
          <TargetItems targets={org} />
        </>
      )}
    </>
  );
}

function TargetField({
  targets,
  ownTeamIds,
  value,
  hint,
  onChange,
}: Readonly<{
  targets: TransferTarget[];
  ownTeamIds: string[];
  value: TransferTarget;
  hint: string;
  onChange: (key: string) => void;
}>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="transfer-target">An</Label>
      <Select value={targetKey(value)} onValueChange={onChange}>
        <SelectTrigger id="transfer-target" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <TargetOptions targets={targets} ownTeamIds={ownTeamIds} />
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function useTransferTargets(
  person: Person,
  resource: ResourceKind,
): TransferTarget[] {
  const { role } = usePrototypeState();
  const isSkill = resource === 'skill';
  const mayRequestTeam = useHasPermission(
    role,
    isSkill ? 'request_skill_transfer' : 'request_knowledge_transfer',
  );
  const mayRequestOrg = useHasPermission(
    role,
    isSkill ? 'request_skill_transfer_org' : 'request_knowledge_transfer_org',
  );
  const mayRequestOther = useHasPermission(
    role,
    isSkill
      ? 'request_skill_transfer_other_teams'
      : 'request_knowledge_transfer_other_teams',
  );
  const mayRequest = (target: TransferTarget) => {
    if (target.kind === 'org') return mayRequestOrg;
    return person.teamIds.includes(target.teamId)
      ? mayRequestTeam
      : mayRequestOther;
  };
  return transferTargetsOf(person, true).filter(
    (target) =>
      mayRequest(target) || canReviewTarget(target, person, role, resource),
  );
}

function transfer(
  item: OwnedItem,
  resource: ResourceKind,
  person: Person,
  target: TransferTarget,
  isDirect: boolean,
) {
  if (isDirect) {
    transferDirectly(resource, item.id, target);
    showSuccess(`„${item.name}“ gehört jetzt ${targetOwnerLabel(target)}.`);
    return;
  }
  requestTransfer({
    resource,
    itemId: item.id,
    target,
    requestedBy: person.id,
    requestedAt: 'Gerade eben',
  });
  showSuccess('Anfrage gestellt.');
}

export function TransferButton({
  item,
  resource,
  person,
}: Readonly<{ item: OwnedItem; resource: ResourceKind; person: Person }>) {
  const { role } = usePrototypeState();
  const targets = useTransferTargets(person, resource);
  const noun = RESOURCE_NOUN[resource];
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  if (targets.length === 0) return null;
  const target =
    targets.find((candidate) => targetKey(candidate) === key) ?? targets[0];
  const isDirect = canReviewTarget(target, person, role, resource);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Forward />
          Übergeben
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{noun} übergeben</DialogTitle>
          <DialogDescription>
            {reviewerText(target, isDirect)}
          </DialogDescription>
        </DialogHeader>
        <TargetField
          targets={targets}
          ownTeamIds={person.teamIds}
          value={target}
          hint={transferHint(target, targets, noun, isDirect)}
          onChange={setKey}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              transfer(item, resource, person, target, isDirect);
              setOpen(false);
            }}
          >
            {isDirect ? 'Übergeben' : 'Anfrage stellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RequestStatus({
  request,
}: Readonly<{ request: TransferRequest }>) {
  const { target } = request;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-sm text-muted-foreground">
      <Clock className="size-4 shrink-0" />
      <span>
        Anfrage an {targetLabel(target)} offen ({request.requestedAt}).{' '}
        {reviewerName(target)} prüft sie.
      </span>
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0"
        onClick={() => {
          withdrawRequest(request.resource, request.itemId);
          showSuccess('Anfrage zurückgezogen.');
        }}
      >
        Zurückziehen
      </Button>
    </div>
  );
}

export function ReviewBanner({
  request,
  item,
}: Readonly<{ request: TransferRequest; item: OwnedItem }>) {
  const requester = findPerson(request.requestedBy).name;
  const noun = RESOURCE_NOUN[request.resource];
  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>
          {requester} möchte diese {noun} an {targetLabel(request.target)}{' '}
          übergeben
        </ItemTitle>
        <ItemDescription>
          Angefragt: {request.requestedAt}. Nach der Freigabe gehört sie{' '}
          {targetOwnerLabel(request.target)}. {requester} kann sie dann nicht
          mehr ändern.
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button
          size="sm"
          variant="outline"
          onClick={() => rejectTransferRequest(request, item.name)}
        >
          Ablehnen
        </Button>
        <Button
          size="sm"
          onClick={() => approveTransferRequest(request, item.name)}
        >
          Freigeben
        </Button>
      </ItemActions>
    </Item>
  );
}
