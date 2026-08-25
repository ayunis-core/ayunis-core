import { ArrowUp, Plus, X } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { CONTEXT_ITEMS } from '@/pages/chat-context-prototype/model/mock';
import { ContextKindIcon } from '@/pages/chat-context-prototype/ui/context-icons';

interface PrototypeInputProps {
  pendingIds: string[];
}

export function PrototypeInput({ pendingIds }: Readonly<PrototypeInputProps>) {
  return (
    <div className="flex flex-col gap-2 pb-4">
      {pendingIds.length > 0 && (
        <div className="flex animate-in flex-wrap gap-1.5 fade-in-0 slide-in-from-bottom-1 duration-200">
          {pendingIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1">
              <ContextKindIcon kind={CONTEXT_ITEMS[id].kind} />
              {CONTEXT_ITEMS[id].name}
              <X className="size-3" />
            </Badge>
          ))}
        </div>
      )}
      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="px-4 pt-3 text-sm text-muted-foreground">
          Nachricht an Ayunis Core
        </div>
        <div className="flex items-center justify-between px-3 py-2">
          <Button variant="ghost" size="icon" aria-label="Anhängen">
            <Plus />
          </Button>
          <Button size="icon" aria-label="Senden">
            <ArrowUp />
          </Button>
        </div>
      </div>
    </div>
  );
}
