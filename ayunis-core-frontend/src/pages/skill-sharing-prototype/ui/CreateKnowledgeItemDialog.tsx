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
import { addKnowledgeItem } from '@/widgets/sharing-prototype/model/prototype-knowledge';
import type { SkillOwner } from '@/widgets/sharing-prototype/model/types';
import {
  createdMessage,
  type OwnerOption,
} from '@/pages/skill-sharing-prototype/lib/owner-options';
import { OwnerField } from './OwnerField';

export function CreateKnowledgeItemDialog({
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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerValue, setOwnerValue] = useState(options[0].value);
  const selected =
    options.find((option) => option.value === ownerValue) ?? options[0];

  function create() {
    addKnowledgeItem({
      id: `wissen-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      owner: selected.owner,
      documentCount: 0,
    });
    showSuccess(createdMessage(name.trim(), selected.owner));
    onOpenChange(false);
    onCreated?.(selected.owner);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Neue Wissenssammlung erstellen</DialogTitle>
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
          <div className="space-y-2">
            <Label htmlFor="knowledge-item-name">Name</Label>
            <Input
              id="knowledge-item-name"
              placeholder="Zum Beispiel: Förderrichtlinien 2027"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="knowledge-item-description">Beschreibung</Label>
            <Textarea
              id="knowledge-item-description"
              rows={2}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button disabled={name.trim() === ''} onClick={create}>
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
