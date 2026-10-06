import { useState } from 'react';
import { Button } from '@ayunis/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ayunis/ui/components/dialog';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Textarea } from '@ayunis/ui/components/textarea';
import { showSuccess } from '@/shared/lib/toast';
import { skillsInGroup } from '@/widgets/sharing-prototype/model/access';
import { GROUP_ORDER } from '@/widgets/sharing-prototype/model/groups';
import {
  addWorkspaceKnowledge,
  setWorkspaceKnowledgeLinked,
  useKnowledgeItems,
} from '@/widgets/sharing-prototype/model/prototype-knowledge';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';

import type {
  AddMode,
  PickerSection,
} from '@/pages/skill-sharing-prototype/model/types';
import { LinkPicker } from './LinkPicker';

function useKnowledgeSections(
  person: Person,
  linkedIds: string[],
): PickerSection[] {
  const items = useKnowledgeItems();
  return GROUP_ORDER.map((group) => ({
    group,
    options: skillsInGroup(items, group, person)
      .filter((knowledge) => !linkedIds.includes(knowledge.id))
      .map((knowledge) => ({
        id: knowledge.id,
        title: knowledge.name,
        description: knowledge.description,
      })),
  })).filter((section) => section.options.length > 0);
}

function KnowledgeLinkPicker({
  workspace,
  person,
  onClose,
}: Readonly<{
  workspace: PrototypeWorkspace;
  person: Person;
  onClose: () => void;
}>) {
  const { linkedKnowledge } = usePrototypeState();
  const linkedIds = (linkedKnowledge[workspace.id] ?? []).map(
    (link) => link.knowledgeId,
  );
  const sections = useKnowledgeSections(person, linkedIds);

  function link(ids: string[]) {
    ids.forEach((knowledgeId) =>
      setWorkspaceKnowledgeLinked(
        workspace.id,
        { knowledgeId, linkedBy: person.id },
        true,
      ),
    );
    showSuccess('Verknüpft.');
    onClose();
  }

  return (
    <LinkPicker
      sections={sections}
      searchLabel="Wissen durchsuchen"
      emptyDescription="Alle Wissenssammlungen, die Sie nutzen können, sind bereits in diesem Arbeitsbereich."
      onCancel={onClose}
      onLink={link}
    />
  );
}

function CreateKnowledgeForm({
  workspace,
  onClose,
}: Readonly<{ workspace: PrototypeWorkspace; onClose: () => void }>) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  function create() {
    addWorkspaceKnowledge(workspace.id, {
      id: `wissen-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
    });
    showSuccess(`„${name.trim()}“ wurde im Arbeitsbereich erstellt.`);
    onClose();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="knowledge-name">Name</Label>
        <Input
          id="knowledge-name"
          placeholder="Zum Beispiel: Förderrichtlinien 2027"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="knowledge-description">Beschreibung</Label>
        <Textarea
          id="knowledge-description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Abbrechen
        </Button>
        <Button disabled={name.trim() === ''} onClick={create}>
          Wissenssammlung erstellen
        </Button>
      </DialogFooter>
    </div>
  );
}

export function AddKnowledgeDialog({
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
              ? 'Neue Wissenssammlung erstellen'
              : 'Vorhandenes Wissen verknüpfen'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Gehört „${workspace.name}“. Alle Mitglieder können sie nutzen. Dokumente fügen Sie danach hinzu.`
              : `Alle Mitglieder von „${workspace.name}“ können es danach nutzen, aber nicht ändern.`}
          </DialogDescription>
        </DialogHeader>
        {mode === 'create' ? (
          <CreateKnowledgeForm workspace={workspace} onClose={onClose} />
        ) : (
          <KnowledgeLinkPicker
            workspace={workspace}
            person={person}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
