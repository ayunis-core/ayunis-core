import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Link2 } from 'lucide-react';
import { showInfo, showSuccess } from '@/shared/lib/toast';
import {
  canEditWorkspace,
  linkedKnowledgeOf,
  workspaceOwnKnowledge,
} from '@/widgets/sharing-prototype/model/access';
import {
  setWorkspaceKnowledgeLinked,
  useKnowledgeItems,
} from '@/widgets/sharing-prototype/model/prototype-knowledge';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  LinkedKnowledge,
  Person,
  PrototypeKnowledge,
  PrototypeWorkspace,
  WorkspaceKnowledge,
} from '@/widgets/sharing-prototype/model/types';
import type { AddMode } from '@/pages/skill-sharing-prototype/model/types';
import { AddKnowledgeMenu } from './AddKnowledgeMenu';
import { EmptyHint } from './EmptyHint';
import { ListRow } from './ListRow';
import { OwnerMeta } from './SkillMeta';
import { SkillPanelSection } from './SkillPanelSection';
import { UnlinkButton } from './UnlinkButton';

function showKnowledgeNotice() {
  showInfo('Wissenssammlungen lassen sich im Prototyp nicht öffnen.');
}

function OwnKnowledgeRows({
  items,
}: Readonly<{ items: WorkspaceKnowledge[] }>) {
  if (items.length === 0) {
    return (
      <EmptyHint
        icon={<BookOpen />}
        title="Noch kein eigenes Wissen"
        description="Wissenssammlungen, die nur diesem Arbeitsbereich gehören."
      />
    );
  }
  return (
    <>
      {items.map((knowledge) => (
        <ListRow
          key={knowledge.id}
          title={knowledge.name}
          description={knowledge.description}
          onClick={showKnowledgeNotice}
        />
      ))}
    </>
  );
}

function LinkedKnowledgeRows({
  workspace,
  viewer,
  canEdit,
  items,
}: Readonly<{
  workspace: PrototypeWorkspace;
  viewer: Person;
  canEdit: boolean;
  items: { link: LinkedKnowledge; knowledge: PrototypeKnowledge }[];
}>) {
  const navigate = useNavigate();
  if (items.length === 0) {
    return (
      <EmptyHint
        icon={<Link2 />}
        title="Noch kein verknüpftes Wissen"
        description="Verknüpfen Sie Wissenssammlungen von Ihnen, Ihrem Team oder der Organisation."
      />
    );
  }
  return (
    <>
      {items.map(({ link, knowledge }) => (
        <ListRow
          key={knowledge.id}
          title={knowledge.name}
          description={knowledge.description}
          onClick={() =>
            void navigate({
              to: '/knowledge-bases/$id',
              params: { id: knowledge.id },
            })
          }
          actions={
            <>
              <OwnerMeta
                skill={knowledge}
                viewer={viewer}
                linkedBy={link.linkedBy}
              />
              {canEdit && (
                <UnlinkButton
                  itemName={knowledge.name}
                  workspaceName={workspace.name}
                  resource="knowledge"
                  onUnlink={() => {
                    setWorkspaceKnowledgeLinked(workspace.id, link, false);
                    showSuccess(
                      `„${knowledge.name}“ ist nicht mehr verknüpft.`,
                    );
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

export function WorkspaceKnowledgePanel({
  workspace,
  person,
  onAdd,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  onAdd: (mode: AddMode) => void;
}>) {
  const { createdKnowledge, linkedKnowledge } = usePrototypeState();
  const canEdit = canEditWorkspace(workspace, person);
  const own = workspaceOwnKnowledge(workspace, createdKnowledge);
  const knowledgeItems = useKnowledgeItems();
  const linked = linkedKnowledgeOf(
    workspace.id,
    linkedKnowledge,
    knowledgeItems,
  );

  return (
    <div className="space-y-6">
      <SkillPanelSection
        title="Im Arbeitsbereich erstellt"
        count={own.length}
        action={
          canEdit && (
            <AddKnowledgeMenu
              onLinkExisting={() => onAdd('link')}
              onCreate={() => onAdd('create')}
            />
          )
        }
      >
        <OwnKnowledgeRows items={own} />
      </SkillPanelSection>
      <SkillPanelSection title="Verknüpft" count={linked.length}>
        <LinkedKnowledgeRows
          workspace={workspace}
          viewer={person}
          canEdit={canEdit}
          items={linked}
        />
      </SkillPanelSection>
    </div>
  );
}
