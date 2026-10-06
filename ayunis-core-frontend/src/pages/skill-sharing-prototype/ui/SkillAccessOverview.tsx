import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  findPerson,
  findTeam,
  findWorkspace,
  orgMemberCount,
  teamAdminIdsWith,
  teamManageKey,
  teamMemberCount,
} from '@/widgets/sharing-prototype/model/access';
import type {
  Person,
  OwnedItem,
  ResourceKind,
} from '@/widgets/sharing-prototype/model/types';
import { orgEditorsSentence } from '@/pages/skill-sharing-prototype/lib/owner-options';
import { RESOURCE_NOUN } from '@/pages/skill-sharing-prototype/lib/requests';

function ownerTitle(item: OwnedItem, person: Person): string {
  const { owner } = item;
  if (owner.kind === 'org') return 'Gehört der Organisation';
  if (owner.kind === 'team') {
    return `Gehört dem Team ${findTeam(owner.teamId).name}`;
  }
  if (owner.kind === 'workspace') {
    return `Gehört dem Arbeitsbereich „${findWorkspace(owner.workspaceId).name}“`;
  }
  return owner.userId === person.id
    ? 'Gehört Ihnen'
    : `Gehört ${findPerson(owner.userId).name}`;
}

function teamEditors(
  teamId: string,
  person: Person,
  resource: ResourceKind,
): string {
  const editors = teamAdminIdsWith(teamId, teamManageKey(resource));
  if (editors.includes(person.id)) {
    return editors.length > 1
      ? 'Ändern können Sie und die anderen Team-Admins.'
      : 'Ändern können Sie als Team-Admin.';
  }
  if (editors.length === 1) {
    return `Ändern kann ${findPerson(editors[0]).name} als Team-Admin.`;
  }
  return editors.length > 0
    ? 'Ändern können die Team-Admins.'
    : 'Ändern können Admins.';
}

function accessSentence(
  item: OwnedItem,
  person: Person,
  resource: ResourceKind,
): string {
  const { owner } = item;
  const noun = RESOURCE_NOUN[resource];
  if (owner.kind === 'org') {
    return `Alle ${orgMemberCount()} Personen in der Organisation können die ${noun} nutzen. ${orgEditorsSentence(resource)}`;
  }
  if (owner.kind === 'team') {
    return `Alle ${teamMemberCount(owner.teamId)} Mitglieder können die ${noun} nutzen. ${teamEditors(owner.teamId, person, resource)}`;
  }
  if (owner.kind === 'workspace') {
    return `Alle Mitglieder des Arbeitsbereichs können die ${noun} nutzen. Ändern kann, wer den Arbeitsbereich bearbeiten darf.`;
  }
  return owner.userId === person.id
    ? `Nur Sie können die ${noun} nutzen und ändern.`
    : `Nur ${findPerson(owner.userId).name} kann die ${noun} nutzen und ändern.`;
}

function submittedSentence(item: OwnedItem, person: Person): string | null {
  if (!item.submittedBy) return null;
  return item.submittedBy === person.id
    ? 'Eingereicht von Ihnen.'
    : `Eingereicht von ${findPerson(item.submittedBy).name}.`;
}

export function SkillAccessOverview({
  skill,
  resource,
  person,
}: Readonly<{ skill: OwnedItem; resource: ResourceKind; person: Person }>) {
  const description = [
    accessSentence(skill, person, resource),
    submittedSentence(skill, person),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Item variant="outline" className="border-brand/50">
      <ItemContent>
        <ItemTitle>{ownerTitle(skill, person)}</ItemTitle>
        <ItemDescription>{description}</ItemDescription>
      </ItemContent>
    </Item>
  );
}
