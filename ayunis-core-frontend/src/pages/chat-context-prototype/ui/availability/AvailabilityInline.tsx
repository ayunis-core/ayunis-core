import { Database, Sparkles } from 'lucide-react';
import { plural } from '@/pages/chat-context-prototype/model/useAvailability';

interface AvailabilityInlineProps {
  skillCount: number;
  knowledgeCount: number;
  align: 'center' | 'start';
}

export function AvailabilityInline({
  skillCount,
  knowledgeCount,
  align,
}: Readonly<AvailabilityInlineProps>) {
  return (
    <div
      className={`flex items-center gap-3 text-xs text-muted-foreground [&_svg]:size-3.5 ${
        align === 'center' ? 'justify-center' : 'justify-start'
      }`}
    >
      <span className="flex items-center gap-1.5">
        <Sparkles />
        {plural(skillCount, 'Fähigkeit', 'Fähigkeiten')} bereit
      </span>
      <span className="flex items-center gap-1.5">
        <Database />
        {plural(knowledgeCount, 'Wissensdatenbank', 'Wissensdatenbanken')}{' '}
        durchsuchbar
      </span>
    </div>
  );
}
