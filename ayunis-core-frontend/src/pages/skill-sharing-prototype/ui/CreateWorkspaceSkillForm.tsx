import { useState } from 'react';
import { Button } from '@ayunis/ui/components/button';
import { DialogFooter } from '@ayunis/ui/components/dialog';
import { showSuccess } from '@/shared/lib/toast';
import { addCreatedSkill } from '@/widgets/sharing-prototype/model/prototype-store';
import type { PrototypeWorkspace } from '@/widgets/sharing-prototype/model/types';
import { SkillFormFields } from './SkillFormFields';

export function CreateWorkspaceSkillForm({
  workspace,
  onCancel,
  onDone,
}: Readonly<{
  workspace: PrototypeWorkspace;
  onCancel: () => void;
  onDone: () => void;
}>) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [instructions, setInstructions] = useState('');
  const canCreate = name.trim() !== '' && trigger.trim() !== '';

  function create() {
    addCreatedSkill({
      id: `neu-${Date.now()}`,
      name: name.trim(),
      shortDescription: trigger.trim(),
      owner: { kind: 'workspace', workspaceId: workspace.id },
    });
    showSuccess(`„${name.trim()}“ wurde im Arbeitsbereich erstellt.`);
    onDone();
  }

  return (
    <div className="space-y-4">
      <SkillFormFields
        name={name}
        trigger={trigger}
        instructions={instructions}
        onNameChange={setName}
        onTriggerChange={setTrigger}
        onInstructionsChange={setInstructions}
      />
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button disabled={!canCreate} onClick={create}>
          Fähigkeit erstellen
        </Button>
      </DialogFooter>
    </div>
  );
}
