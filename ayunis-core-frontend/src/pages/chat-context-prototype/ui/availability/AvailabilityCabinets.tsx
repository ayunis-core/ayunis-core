import { Link } from '@tanstack/react-router';
import { Database, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { plural } from '@/pages/chat-context-prototype/model/useAvailability';

interface CabinetProps {
  to: '/skills' | '/knowledge-bases';
  count: number;
  label: string;
  tooltip: string;
  kind: 'skill' | 'knowledge';
}

function Cabinet({ to, count, label, tooltip, kind }: Readonly<CabinetProps>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={to}
          className="flex w-28 flex-col items-center gap-1 rounded-md border bg-card px-3 py-2.5 transition-colors hover:bg-accent"
        >
          <span className="text-muted-foreground [&_svg]:size-4">
            {kind === 'skill' ? <Sparkles /> : <Database />}
          </span>
          <span className="text-sm font-medium">{count}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function AvailabilityCabinets({
  skillCount,
  knowledgeCount,
}: Readonly<{ skillCount: number; knowledgeCount: number }>) {
  return (
    <div className="flex items-start justify-center gap-2">
      <Cabinet
        to="/skills"
        kind="skill"
        count={skillCount}
        label={skillCount === 1 ? 'Fähigkeit' : 'Fähigkeiten'}
        tooltip="Werden passend zu Ihrer Nachricht aktiviert"
      />
      <Cabinet
        to="/knowledge-bases"
        kind="knowledge"
        count={knowledgeCount}
        label={knowledgeCount === 1 ? 'Wissensquelle' : 'Wissensquellen'}
        tooltip="Werden bei Bedarf im Hintergrund durchsucht"
      />
      <span className="sr-only">
        {plural(skillCount, 'Fähigkeit', 'Fähigkeiten')}
      </span>
    </div>
  );
}
