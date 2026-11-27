import { Card } from '@ayunis/ui/components/card';
import type { ChatFact } from '@/pages/welcome-prototype/model/chat-script';

export function MemoryCard({ facts }: Readonly<{ facts: ChatFact[] }>) {
  return (
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
  );
}
