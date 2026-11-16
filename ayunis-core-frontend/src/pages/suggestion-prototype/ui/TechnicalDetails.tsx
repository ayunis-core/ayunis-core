import { ChevronDown } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';

export function TechnicalDetails({ text }: Readonly<{ text: string }>) {
  return (
    <Collapsible className="group/technical">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="-ml-2 text-muted-foreground"
        >
          Technische Angaben
          <ChevronDown className="transition-transform group-data-[state=open]/technical:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 overflow-auto font-mono text-xs whitespace-pre-wrap">
          {text}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}
