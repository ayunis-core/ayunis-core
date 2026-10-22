import { useNavigate } from '@tanstack/react-router';
import { BookOpenText } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { SkillPropertiesCard } from '@/widgets/resource-properties-card';
import { EmptyState } from '@/widgets/empty-state';
import { showSuccess } from '@/shared/lib/toast';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  canEditSkill,
  findSkill,
  findWorkspace,
  personForRole,
  canReviewTarget,
} from '@/widgets/sharing-prototype/model/access';
import {
  useHasPermission,
  usePrototypeSkills,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import { instructionsFor } from '@/widgets/sharing-prototype/model/skill-instructions';
import type {
  Person,
  PrototypeSkill,
  Role,
  TransferRequest,
} from '@/widgets/sharing-prototype/model/types';
import { isOwnSkill } from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { requestFor } from '@/pages/skill-sharing-prototype/lib/requests';
import { useDeleteWithConfirmation } from '@/pages/skill-sharing-prototype/model/useDeleteWithConfirmation';
import { ActiveSwitch } from './ActiveSwitch';
import { DeleteSkillButton } from './DeleteSkillButton';
import { LinkedWorkspacesSection } from './LinkedWorkspacesSection';
import { MandatorySkillControl } from './MandatorySkillControl';
import { ReadOnlyBadge } from './ReadOnlyBadge';
import { SkillAccessOverview } from './SkillAccessOverview';
import { SkillReadOnlyContent } from './SkillReadOnlyContent';
import {
  SkillDocumentsCard,
  SkillIntegrationsCard,
} from './SkillResourceCards';
import { RequestStatus, ReviewBanner, TransferButton } from './SkillTransfer';

function RequestArea({
  skill,
  person,
  role,
  request,
}: Readonly<{
  skill: PrototypeSkill;
  person: Person;
  role: Role;
  request: TransferRequest | undefined;
}>) {
  if (!request) return null;
  if (request.requestedBy === person.id) {
    return <RequestStatus request={request} />;
  }
  return canReviewTarget(request.target, person, role, 'skill') ? (
    <ReviewBanner request={request} item={skill} />
  ) : null;
}

function KnowledgeTip() {
  return (
    <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
      <BookOpenText className="mt-0.5 size-4 shrink-0" />
      Soll die Fähigkeit eine Wissenssammlung nutzen? Nennen Sie sie in der
      Anweisung, zum Beispiel „Nutze die Wissenssammlung Haushaltssatzung 2026“.
    </p>
  );
}

function breadcrumbsFor(skill: PrototypeSkill) {
  if (skill.owner.kind !== 'workspace') {
    return [{ label: 'Fähigkeiten', href: '/skills' }, { label: skill.name }];
  }
  const workspace = findWorkspace(skill.owner.workspaceId);
  return [
    { label: 'Arbeitsbereiche', href: '/workspaces' },
    {
      label: workspace.name,
      href: `/workspaces/${workspace.id}`,
      search: { tab: 'skills' },
    },
    { label: skill.name },
  ];
}

function useDeleteAndLeave(skill: PrototypeSkill) {
  const navigate = useNavigate();
  return useDeleteWithConfirmation(() => {
    if (skill.owner.kind === 'workspace') {
      void navigate({
        to: '/workspaces/$workspaceId',
        params: { workspaceId: skill.owner.workspaceId },
        search: { tab: 'skills' },
      });
      return;
    }
    void navigate({ to: '/skills' });
  });
}

function HeaderActions({
  skill,
  person,
  canTransfer,
  canDelete,
}: Readonly<{
  skill: PrototypeSkill;
  person: Person;
  canTransfer: boolean;
  canDelete: boolean;
}>) {
  const deleteAndLeave = useDeleteAndLeave(skill);
  return (
    <>
      <HelpLink path="skills/" />
      {skill.owner.kind !== 'workspace' && <ActiveSwitch skillId={skill.id} />}
      {canTransfer && (
        <TransferButton item={skill} resource="skill" person={person} />
      )}
      {canDelete && <DeleteSkillButton onClick={() => deleteAndLeave(skill)} />}
    </>
  );
}

function SkillBody({
  skill,
  person,
  isEditable,
}: Readonly<{ skill: PrototypeSkill; person: Person; isEditable: boolean }>) {
  const linksResources =
    isOwnSkill(skill, person) || skill.owner.kind === 'workspace';
  return (
    <>
      <div className="space-y-3">
        {isEditable ? (
          <SkillPropertiesCard
            key={skill.id}
            skill={{
              name: skill.name,
              shortDescription: skill.shortDescription,
              instructions: instructionsFor(skill),
            }}
            onUpdate={() => {
              showSuccess('Änderungen gespeichert.');
              return Promise.resolve();
            }}
          />
        ) : (
          <SkillReadOnlyContent
            trigger={skill.shortDescription}
            instructions={instructionsFor(skill)}
          />
        )}
        {isEditable && <KnowledgeTip />}
      </div>
      {linksResources && <SkillIntegrationsCard disabled={!isEditable} />}
      <SkillDocumentsCard skillId={skill.id} disabled={!isEditable} />
    </>
  );
}

function SkillDetail({
  skill,
  person,
}: Readonly<{ skill: PrototypeSkill; person: Person }>) {
  const { role, requests } = usePrototypeState();
  const isEditable = canEditSkill(skill, person, role);
  const request = requestFor(requests, 'skill', skill.id);
  const canTransfer = isOwnSkill(skill, person) && !request;
  const mayManageOwn = useHasPermission(role, 'manage_own_skills');
  const canDelete = isEditable && (skill.owner.kind !== 'user' || mayManageOwn);

  return (
    <ContentAreaLayout
      contentHeader={
        <ContentAreaHeader
          breadcrumbs={breadcrumbsFor(skill)}
          badge={isEditable ? undefined : <ReadOnlyBadge />}
          action={
            <HeaderActions
              skill={skill}
              person={person}
              canTransfer={canTransfer}
              canDelete={canDelete}
            />
          }
        />
      }
      contentArea={
        <div className="space-y-6">
          <div className="space-y-3">
            <SkillAccessOverview
              skill={skill}
              resource="skill"
              person={person}
            />
            <RequestArea
              skill={skill}
              person={person}
              role={role}
              request={request}
            />
          </div>
          <SkillBody skill={skill} person={person} isEditable={isEditable} />
          {skill.owner.kind !== 'workspace' && (
            <LinkedWorkspacesSection
              resource="skill"
              itemId={skill.id}
              person={person}
            />
          )}
          {skill.owner.kind === 'org' && isEditable && (
            <MandatorySkillControl skill={skill} />
          )}
        </div>
      }
    />
  );
}

export function PrototypeSkillPage({ skillId }: Readonly<{ skillId: string }>) {
  const { role } = usePrototypeState();
  const skills = usePrototypeSkills();
  const skill = findSkill(skills, skillId);
  const person = personForRole(role);

  return (
    <AppLayout>
      {skill ? (
        <SkillDetail skill={skill} person={person} />
      ) : (
        <ContentAreaLayout
          contentHeader={
            <ContentAreaHeader
              breadcrumbs={[{ label: 'Fähigkeiten', href: '/skills' }]}
            />
          }
          contentArea={
            <EmptyState
              title="Diese Fähigkeit gibt es im Prototyp nicht"
              description="Öffnen Sie eine Fähigkeit aus der Liste."
            />
          }
        />
      )}
    </AppLayout>
  );
}
