import { ChevronLeft, ExternalLink } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { showInfo } from '@/shared/lib/toast';
import { CONTEXT_ITEMS } from '@/pages/chat-context-prototype/model/mock';
import { ContextKindIcon } from '@/pages/chat-context-prototype/ui/context-icons';

const KIND_LABELS = {
  skill: 'Fähigkeit',
  knowledgeBase: 'Wissensdatenbank',
  file: 'Datei',
  integration: 'Integration',
};

interface ContextDetailBodyProps {
  contextId: string;
  onBack: () => void;
}

export function ContextDetailBody({
  contextId,
  onBack,
}: Readonly<ContextDetailBodyProps>) {
  const item = CONTEXT_ITEMS[contextId];
  return (
    <div className="flex animate-in flex-col gap-4 fade-in-0 slide-in-from-right-2 duration-200">
      <Button variant="ghost" size="sm" className="w-fit" onClick={onBack}>
        <ChevronLeft />
        Kontext
      </Button>
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 text-brand [&_svg]:size-4">
          <ContextKindIcon kind={item.kind} />
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 className="text-sm font-medium">{item.name}</h3>
          <span className="text-xs text-muted-foreground">
            {KIND_LABELS[item.kind]} · {item.detail}
          </span>
        </div>
      </div>
      {item.purpose && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {item.purpose}
        </p>
      )}
      {item.brings && item.brings.length > 0 && (
        <section className="flex flex-col gap-1">
          <h4 className="text-xs font-medium text-muted-foreground">
            Bringt mit
          </h4>
          <ul className="flex flex-col gap-1">
            {item.brings.map((entry) => (
              <li key={entry} className="text-sm">
                {entry}
              </li>
            ))}
          </ul>
        </section>
      )}
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => showInfo(`Detailseite von „${item.name}“`)}
      >
        <ExternalLink />
        {item.kind === 'skill' ? 'Zur Fähigkeit' : 'Zur Detailseite'}
      </Button>
    </div>
  );
}
