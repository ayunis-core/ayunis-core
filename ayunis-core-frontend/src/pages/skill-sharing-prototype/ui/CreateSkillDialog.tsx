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
import { showSuccess } from '@/shared/lib/toast';
import { addCreatedSkill } from '@/widgets/sharing-prototype/model/prototype-store';
import type { SkillOwner } from '@/widgets/sharing-prototype/model/types';
import {
  createdMessage,
  type OwnerOption,
} from '@/pages/skill-sharing-prototype/lib/owner-options';
import { OwnerField } from './OwnerField';
import { SkillFormFields } from './SkillFormFields';

function dialogTitle(options: OwnerOption[]): string {
  return options.length === 1 && options[0].owner.kind === 'org'
    ? 'Fähigkeit für die Organisation erstellen'
    : 'Neue Fähigkeit erstellen';
}

function useSkillDraft() {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [instructions, setInstructions] = useState('');
  return {
    name,
    trigger,
    instructions,
    setName,
    setTrigger,
    setInstructions,
    isComplete: name.trim() !== '' && trigger.trim() !== '',
  };
}

export function CreateSkillDialog({
  open,
  onOpenChange,
  options,
  onCreated,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: OwnerOption[];
  onCreated?: (owner: SkillOwner) => void;
}>) {
  const draft = useSkillDraft();
  const [ownerValue, setOwnerValue] = useState(options[0].value);
  const selected =
    options.find((option) => option.value === ownerValue) ?? options[0];

  function create() {
    addCreatedSkill({
      id: `neu-${Date.now()}`,
      name: draft.name.trim(),
      shortDescription: draft.trigger.trim(),
      owner: selected.owner,
    });
    showSuccess(createdMessage(draft.name.trim(), selected.owner));
    onOpenChange(false);
    onCreated?.(selected.owner);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle(options)}</DialogTitle>
          {options.length === 1 && (
            <DialogDescription>{selected.hint}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4">
          {options.length > 1 && (
            <OwnerField
              options={options}
              value={selected}
              onChange={setOwnerValue}
            />
          )}
          <SkillFormFields
            name={draft.name}
            trigger={draft.trigger}
            instructions={draft.instructions}
            onNameChange={draft.setName}
            onTriggerChange={draft.setTrigger}
            onInstructionsChange={draft.setInstructions}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button disabled={!draft.isComplete} onClick={create}>
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
