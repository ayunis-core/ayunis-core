import { Hand } from 'lucide-react';
import { Card, CardContent } from '@ayunis/ui/components/card';
import { Button } from '@ayunis/ui/components/button';

interface PlanApprovalCardProps {
  title: string;
  steps: string[];
  onApprove?: () => void;
  onModify?: () => void;
}

/**
 * Compact in-chat plan-approval card for the "ask before acting" mode: Ayunis
 * Core lays out its steps and waits for confirmation before doing anything.
 * Prototype UI — the actions are visual only for now.
 */
export function PlanApprovalCard({
  title,
  steps,
  onApprove,
  onModify,
}: Readonly<PlanApprovalCardProps>) {
  return (
    <Card className="w-full max-w-md gap-0 overflow-hidden py-0 text-sm">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-muted-foreground">
        <Hand className="h-3.5 w-3.5 shrink-0" />
        <span className="text-xs font-medium">Vor dem Handeln nachfragen</span>
      </div>

      <CardContent className="flex flex-col gap-3 px-3 py-3">
        <p className="font-medium">{title}</p>

        <ol className="flex flex-col gap-1.5">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-2">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] text-muted-foreground">
                {index + 1}
              </span>
              <span className="text-muted-foreground">{step}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-col gap-2 pt-1">
          <Button size="sm" onClick={onApprove}>
            Plan genehmigen
          </Button>
          <Button size="sm" variant="outline" onClick={onModify}>
            Änderungen vornehmen
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Ayunis Core führt die Schritte erst nach deiner Bestätigung aus.
        </p>
      </CardContent>
    </Card>
  );
}
