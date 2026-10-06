import type { ReactNode } from 'react';
import { Input } from '@ayunis/ui/components/input';
import { Label } from '@ayunis/ui/components/label';
import { Textarea } from '@ayunis/ui/components/textarea';

function Field({
  id,
  label,
  hint,
  children,
}: Readonly<{
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SkillFormFields({
  name,
  trigger,
  instructions,
  onNameChange,
  onTriggerChange,
  onInstructionsChange,
}: Readonly<{
  name: string;
  trigger: string;
  instructions: string;
  onNameChange: (value: string) => void;
  onTriggerChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
}>) {
  return (
    <>
      <Field id="skill-name" label="Name">
        <Input
          id="skill-name"
          placeholder="Zum Beispiel: Sitzungsvorlage Haushalt"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
        />
      </Field>
      <Field
        id="skill-trigger"
        label="Auslöser"
        hint="Beschreiben Sie, wann Ayunis Core diese Fähigkeit nutzen soll."
      >
        <Textarea
          id="skill-trigger"
          rows={2}
          value={trigger}
          onChange={(event) => onTriggerChange(event.target.value)}
        />
      </Field>
      <Field
        id="skill-instructions"
        label="Anweisungen"
        hint="Soll eine Wissenssammlung genutzt werden? Nennen Sie sie hier."
      >
        <Textarea
          id="skill-instructions"
          rows={4}
          value={instructions}
          onChange={(event) => onInstructionsChange(event.target.value)}
        />
      </Field>
    </>
  );
}
