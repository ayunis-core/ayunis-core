import { useNavigate } from '@tanstack/react-router';
import { Link2, Sparkles } from 'lucide-react';
import { showSuccess } from '@/shared/lib/toast';
import {
  canEditWorkspace,
  findSkill,
  workspaceOwnSkills,
} from '@/widgets/sharing-prototype/model/access';
import {
  setWorkspaceSkillLinked,
  usePrototypeSkills,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  LinkedSkill,
  Person,
  PrototypeSkill,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';
import type { AddMode } from '@/pages/skill-sharing-prototype/model/types';
import { CreateSkillMenu } from './CreateSkillMenu';
import { EmptyHint } from './EmptyHint';
import { ListRow } from './ListRow';
import { OwnerMeta } from './SkillMeta';
import { SkillPanelSection } from './SkillPanelSection';
import { UnlinkButton } from './UnlinkButton';

function LinkedRows({
  workspace,
  viewer,
  canEdit,
  links,
}: Readonly<{
  workspace: PrototypeWorkspace;
  viewer: Person;
  canEdit: boolean;
  links: { link: LinkedSkill; skill: PrototypeSkill }[];
}>) {
  const navigate = useNavigate();
  if (links.length === 0) {
    return (
      <EmptyHint
        icon={<Link2 />}
        title="Noch keine verknüpften Fähigkeiten"
        description="Verknüpfen Sie Fähigkeiten von Ihnen, Ihrem Team oder der Organisation."
      />
    );
  }
  return (
    <>
      {links.map(({ link, skill }) => (
        <ListRow
          key={skill.id}
          title={skill.name}
          description={skill.shortDescription}
          onClick={() =>
            void navigate({ to: '/skills/$id', params: { id: skill.id } })
          }
          actions={
            <>
              <OwnerMeta
                skill={skill}
                viewer={viewer}
                linkedBy={link.linkedBy}
              />
              {canEdit && (
                <UnlinkButton
                  itemName={skill.name}
                  workspaceName={workspace.name}
                  resource="skill"
                  onUnlink={() => {
                    setWorkspaceSkillLinked(workspace.id, link, false);
                    showSuccess(`„${skill.name}“ ist nicht mehr verknüpft.`);
                  }}
                />
              )}
            </>
          }
        />
      ))}
    </>
  );
}

function OwnRows({
  workspace,
  skills,
}: Readonly<{ workspace: PrototypeWorkspace; skills: PrototypeSkill[] }>) {
  const navigate = useNavigate();
  if (skills.length === 0) {
    return (
      <EmptyHint
        icon={<Sparkles />}
        title="Noch keine eigenen Fähigkeiten"
        description="Fähigkeiten, die nur diesem Arbeitsbereich gehören."
      />
    );
  }
  return (
    <>
      {skills.map((skill) => (
        <ListRow
          key={skill.id}
          title={skill.name}
          description={skill.shortDescription}
          onClick={() =>
            void navigate({
              to: '/workspaces/$workspaceId/skills/$skillId',
              params: { workspaceId: workspace.id, skillId: skill.id },
            })
          }
        />
      ))}
    </>
  );
}

export function WorkspaceSkillsPanel({
  workspace,
  person,
  onAdd,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  onAdd: (mode: AddMode) => void;
}>) {
  const skills = usePrototypeSkills();
  const { linkedSkills } = usePrototypeState();
  const canEdit = canEditWorkspace(workspace, person);
  const ownSkills = workspaceOwnSkills(skills, workspace.id);
  const links = (linkedSkills[workspace.id] ?? []).flatMap((link) => {
    const skill = findSkill(skills, link.skillId);
    return skill ? [{ link, skill }] : [];
  });

  return (
    <div className="space-y-6">
      <SkillPanelSection
        title="Im Arbeitsbereich erstellt"
        count={ownSkills.length}
        action={
          canEdit && (
            <CreateSkillMenu
              workspaceName={workspace.name}
              onLinkExisting={() => onAdd('link')}
              onCreateYourself={() => onAdd('create')}
            />
          )
        }
      >
        <OwnRows workspace={workspace} skills={ownSkills} />
      </SkillPanelSection>
      <SkillPanelSection title="Verknüpft" count={links.length}>
        <LinkedRows
          workspace={workspace}
          viewer={person}
          canEdit={canEdit}
          links={links}
        />
      </SkillPanelSection>
    </div>
  );
}
