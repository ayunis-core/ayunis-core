import { AddItemsDialog } from './AddItemsDialog';
import {
  availableSkills,
  availableKnowledgeBases,
  SKILL_DESCRIPTIONS,
  addSkillsToProject,
  addKnowledgeBasesToProject,
  type MockProject,
} from '@/entities/project';

export type AddItemKind = 'skills' | 'kb' | null;

interface AddProjectItemsDialogProps {
  project: MockProject;
  kind: AddItemKind;
  onClose: () => void;
}

export function AddProjectItemsDialog({
  project,
  kind,
  onClose,
}: Readonly<AddProjectItemsDialogProps>) {
  const isKb = kind === 'kb';

  function handleConfirm(ids: string[]) {
    if (kind === 'skills') {
      addSkillsToProject(
        project.id,
        availableSkills.filter((s) => ids.includes(s.id)),
      );
    } else if (kind === 'kb') {
      addKnowledgeBasesToProject(
        project.id,
        availableKnowledgeBases.filter((k) => ids.includes(k.id)),
      );
    }
  }

  return (
    <AddItemsDialog
      open={kind !== null}
      onOpenChange={(next) => !next && onClose()}
      title={isKb ? 'Wissensdatenbanken hinzufügen' : 'Skills hinzufügen'}
      items={
        isKb
          ? availableKnowledgeBases.map((k) => ({
              id: k.id,
              name: k.name,
              meta: `${k.documentCount} Dokumente`,
            }))
          : availableSkills.map((s) => ({
              id: s.id,
              name: s.name,
              meta: SKILL_DESCRIPTIONS[s.name],
            }))
      }
      addedIds={
        isKb
          ? project.knowledgeBases.map((k) => k.id)
          : project.skills.map((s) => s.id)
      }
      onConfirm={handleConfirm}
    />
  );
}
