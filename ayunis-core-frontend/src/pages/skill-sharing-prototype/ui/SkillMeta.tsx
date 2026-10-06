import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { findPerson, findTeam } from '@/widgets/sharing-prototype/model/access';
import type {
  Person,
  OwnedItem,
} from '@/widgets/sharing-prototype/model/types';

export function MetaText({
  text,
  lines,
}: Readonly<{ text: string; lines: string[] }>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="max-w-56 truncate text-sm text-muted-foreground">
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </TooltipContent>
    </Tooltip>
  );
}

function isViewer(personId: string, viewer: Person): boolean {
  return personId === viewer.id;
}

function ownerText(skill: OwnedItem, viewer: Person): string {
  const { owner } = skill;
  if (owner.kind === 'team') return `Team ${findTeam(owner.teamId).name}`;
  if (owner.kind === 'user') {
    return isViewer(owner.userId, viewer)
      ? 'Sie'
      : findPerson(owner.userId).name;
  }
  if (owner.kind === 'workspace') return 'Arbeitsbereich';
  return 'Organisation';
}

function ownerSentence(skill: OwnedItem, viewer: Person): string {
  const { owner } = skill;
  if (owner.kind === 'team') {
    return `Gehört dem Team ${findTeam(owner.teamId).name}`;
  }
  if (owner.kind === 'user') {
    return isViewer(owner.userId, viewer)
      ? 'Gehört Ihnen'
      : `Gehört ${findPerson(owner.userId).name}`;
  }
  if (owner.kind === 'workspace') return 'Gehört dem Arbeitsbereich';
  return 'Gehört der Organisation';
}

function linkedSentence(linkedBy: string, viewer: Person): string {
  return isViewer(linkedBy, viewer)
    ? 'Verknüpft von Ihnen'
    : `Verknüpft von ${findPerson(linkedBy).name}`;
}

export function OwnerMeta({
  skill,
  viewer,
  linkedBy,
}: Readonly<{ skill: OwnedItem; viewer: Person; linkedBy?: string }>) {
  const lines = [ownerSentence(skill, viewer)];
  if (linkedBy) lines.push(linkedSentence(linkedBy, viewer));
  return <MetaText text={ownerText(skill, viewer)} lines={lines} />;
}
