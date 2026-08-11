import { useState } from 'react';
import { Hand, Zap, ChevronDown } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@ayunis/ui/components/dropdown-menu';

type ActionMode = 'ask' | 'auto';

const MODES: Record<
  ActionMode,
  { label: string; description: string; icon: typeof Hand }
> = {
  ask: {
    label: 'Vor dem Handeln nachfragen',
    description: 'Ayunis Core plant die Schritte und fragt vor Aktionen nach.',
    icon: Hand,
  },
  auto: {
    label: 'Ohne Nachfrage handeln',
    description: 'Ayunis Core führt die Schritte direkt aus.',
    icon: Zap,
  },
};

export function ActionModeSelector() {
  const [mode, setMode] = useState<ActionMode>('ask');
  const ActiveIcon = MODES[mode].icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 min-w-0 gap-1.5 px-2 text-muted-foreground"
        >
          <ActiveIcon className="h-4 w-4 shrink-0" />
          {/* Label collapses to icon-only once the input toolbar (a @container)
              gets too narrow, so the row never wraps to a second line. */}
          <span className="hidden min-w-0 truncate @min-[40rem]:inline">
            {MODES[mode].label}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 opacity-60 @min-[40rem]:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        {(Object.keys(MODES) as ActionMode[]).map((key) => {
          const ItemIcon = MODES[key].icon;
          return (
            <DropdownMenuItem
              key={key}
              onSelect={() => setMode(key)}
              className="items-start gap-2 py-2"
            >
              <ItemIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">{MODES[key].label}</span>
                <span className="text-xs text-muted-foreground">
                  {MODES[key].description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
