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
import { Label } from '@ayunis/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ayunis/ui/components/select';
import { showSuccess } from '@/shared/lib/toast';
import {
  findPerson,
  sharedPersonIds,
} from '@/widgets/sharing-prototype/model/access';
import { transferWorkspaceOwnership } from '@/widgets/sharing-prototype/model/prototype-workspace-shares';
import type {
  Person,
  PrototypeWorkspace,
} from '@/widgets/sharing-prototype/model/types';
import { affiliationOf } from '@/pages/skill-sharing-prototype/lib/member-options';

function ownerCandidates(workspace: PrototypeWorkspace): Person[] {
  const ids = new Set(sharedPersonIds(workspace));
  ids.delete(workspace.ownerId);
  return [...ids]
    .map((id) => findPerson(id))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function CandidateField({
  candidates,
  value,
  onChange,
}: Readonly<{
  candidates: Person[];
  value: string | undefined;
  onChange: (personId: string) => void;
}>) {
  return (
    <div className="space-y-2">
      <Label htmlFor="workspace-owner">An</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="workspace-owner" className="w-full">
          <SelectValue placeholder="Person auswählen" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((person) => (
            <SelectItem key={person.id} value={person.id}>
              <span className="flex flex-col items-start gap-0.5">
                <span>{person.name}</span>
                <span className="text-xs text-muted-foreground">
                  {affiliationOf(person)}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Zur Auswahl stehen alle, die eingeladen sind.
      </p>
    </div>
  );
}

export function WorkspaceTransferDialog({
  workspace,
  open,
  onOpenChange,
}: Readonly<{
  workspace: PrototypeWorkspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>) {
  const [personId, setPersonId] = useState<string>();
  const candidates = ownerCandidates(workspace);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eigentum übertragen</DialogTitle>
          <DialogDescription>
            Die Person wird Eigentümer von „{workspace.name}“ und kann den
            Arbeitsbereich dann auch löschen. Sie behalten Vollzugriff.
            {candidates.length === 0 &&
              ' Laden Sie zuerst jemanden in den Arbeitsbereich ein.'}
          </DialogDescription>
        </DialogHeader>
        {candidates.length > 0 && (
          <CandidateField
            candidates={candidates}
            value={personId}
            onChange={setPersonId}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            disabled={!personId}
            onClick={() => {
              if (!personId) return;
              transferWorkspaceOwnership(workspace.id, personId);
              showSuccess(
                `„${workspace.name}“ gehört jetzt ${findPerson(personId).name}.`,
              );
              onOpenChange(false);
            }}
          >
            Übertragen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
