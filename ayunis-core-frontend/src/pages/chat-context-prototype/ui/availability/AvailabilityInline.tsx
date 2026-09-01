import { Database, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { plural } from '@/pages/chat-context-prototype/model/useAvailability';

interface AvailabilityInlineProps {
  skillCount: number;
  knowledgeCount: number;
}

export function AvailabilityInline({
  skillCount,
  knowledgeCount,
}: Readonly<AvailabilityInlineProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex cursor-default items-center justify-end gap-3 text-xs text-muted-foreground [&_svg]:size-3.5">
          <span className="flex items-center gap-1.5">
            <Sparkles />
            {plural(skillCount, 'Fähigkeit', 'Fähigkeiten')} bereit
          </span>
          <span className="flex items-center gap-1.5">
            <Database />
            {plural(
              knowledgeCount,
              'Wissensdatenbank',
              'Wissensdatenbanken',
            )}{' '}
            durchsuchbar
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        Fähigkeiten wählt Ayunis Core passend zu Ihrer Nachricht aus,
        Wissensdatenbanken durchsucht es bei Bedarf. Sie müssen nichts anhängen.
      </TooltipContent>
    </Tooltip>
  );
}
