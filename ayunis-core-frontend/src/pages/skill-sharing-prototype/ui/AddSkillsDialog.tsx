import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { showSuccess } from '@/shared/lib/toast';
import { skillsInGroup } from '@/widgets/sharing-prototype/model/access';
import { GROUP_ORDER } from '@/widgets/sharing-prototype/model/groups';
import {
  setWorkspaceSkillLinked,
  usePrototypeSkills,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';
import type {
  AddMode,
  PickerSection,
} from '@/pages/skill-sharing-prototype/model/types';
import { CreateWorkspaceSkillForm } from './CreateWorkspaceSkillForm';
import { LinkPicker } from './LinkPicker';

function useSkillSections(
  person: Person,
  linkedIds: string[],
): PickerSection[] {
  const skills = usePrototypeSkills();
  return GROUP_ORDER.map((group) => ({
    group,
    options: skillsInGroup(skills, group, person)
      .filter((skill) => !linkedIds.includes(skill.id))
      .map((skill) => ({
        id: skill.id,
        title: skill.name,
        description: skill.shortDescription,
      })),
  })).filter((section) => section.options.length > 0);
}

function SkillLinkPicker({
  workspace,
  person,
  onClose,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  onClose: () => void;
}>) {
  const { linkedSkills } = usePrototypeState();
  const linkedIds = (linkedSkills[workspace.id] ?? []).map((l) => l.skillId);
  const sections = useSkillSections(person, linkedIds);

  function link(ids: string[]) {
    ids.forEach((skillId) =>
      setWorkspaceSkillLinked(
        workspace.id,
        { skillId, linkedBy: person.id },
        true,
      ),
    );
    showSuccess('Verknüpft.');
    onClose();
  }

  return (
    <LinkPicker
      sections={sections}
      searchLabel="Fähigkeiten durchsuchen"
      emptyDescription="Alle Fähigkeiten, die Sie nutzen können, sind bereits in diesem Arbeitsbereich."
      onCancel={onClose}
      onLink={link}
    />
  );
}

export function AddSkillsDialog({
  workspace,
  person,
  mode,
  onClose,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  mode: AddMode | null;
  onClose: () => void;
}>) {
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Neue Fähigkeit erstellen'
              : 'Vorhandene Fähigkeiten verknüpfen'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Gehört „${workspace.name}“. Alle Mitglieder können sie nutzen, ändern kann jeder, der den Arbeitsbereich bearbeiten darf.`
              : `Alle Mitglieder von „${workspace.name}“ können sie danach nutzen, aber nicht ändern.`}
          </DialogDescription>
        </DialogHeader>
        {mode === 'create' ? (
          <CreateWorkspaceSkillForm
            workspace={workspace}
            onCancel={onClose}
            onDone={onClose}
          />
        ) : (
          <SkillLinkPicker
            workspace={workspace}
            person={person}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
