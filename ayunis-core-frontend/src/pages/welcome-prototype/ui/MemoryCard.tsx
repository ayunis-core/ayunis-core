import { Button } from '@ayunis/ui/components/button';
import { Card } from '@ayunis/ui/components/card';
import type { ChatFact } from '@/pages/welcome-prototype/model/chat-script';

export function MemoryCard({
  facts,
  active,
  onConfirm,
}: Readonly<{ facts: ChatFact[]; active: boolean; onConfirm: () => void }>) {
  return (
    <div className="flex w-full flex-col gap-3">
      <Card className="bg-background gap-0 py-2">
        <dl className="divide-y text-sm">
          {facts.map((fact) => (
            <div key={fact.label} className="flex gap-4 px-5 py-2.5">
              <dt className="text-muted-foreground w-28 shrink-0">
                {fact.label}
              </dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      {active && (
        <div className="flex gap-2">
          <Button size="sm" onClick={onConfirm}>
            Passt so
          </Button>
          <Button size="sm" variant="ghost">
            Bearbeiten
          </Button>
        </div>
      )}
    </div>
  );
}
