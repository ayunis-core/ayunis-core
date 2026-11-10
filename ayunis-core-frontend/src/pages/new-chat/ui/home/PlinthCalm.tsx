import { Link } from '@tanstack/react-router';
import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Lightbulb,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import {
  SUGGESTIONS,
  type PlinthSuggestion,
} from '@/pages/new-chat/model/plinth-suggestions';

const TYPE_ICON: Record<PlinthSuggestion['type'], LucideIcon> = {
  prompt: Lightbulb,
  routine: CalendarClock,
  continue: CornerDownRight,
};

export function SuggestionChip({
  suggestion,
  isOpen,
  register,
  onToggle,
}: Readonly<{
  suggestion: PlinthSuggestion;
  isOpen: boolean;
  register: (element: HTMLButtonElement | null) => void;
  onToggle: () => void;
}>) {
  const Icon = TYPE_ICON[suggestion.type];
  return (
    <button
      ref={register}
      type="button"
      aria-expanded={isOpen}
      onClick={onToggle}
      className={cn(
        'home-plinth__chip home-plinth__suggestion min-w-0',
        isOpen && 'home-plinth__chip--active',
      )}
    >
      <Icon className="home-plinth__icon size-3.5 shrink-0" />
      <span className="text-muted-foreground">Vorschlag:</span>
      <span className="truncate">{suggestion.short}</span>
      <ChevronDown
        className={cn(
          'home-plinth__icon size-3.5 shrink-0 transition-transform duration-300',
          isOpen && 'rotate-180',
        )}
      />
    </button>
  );
}

function SuggestionActions({
  suggestion,
  onSend,
  onEdit,
}: Readonly<{
  suggestion: PlinthSuggestion;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
}>) {
  if (suggestion.type === 'routine') {
    return (
      <Button size="sm" asChild>
        <Link to="/routines">Einrichten</Link>
      </Button>
    );
  }
  if (suggestion.type === 'continue') {
    return (
      <Button size="sm" asChild>
        <Link to="/chats">Öffnen</Link>
      </Button>
    );
  }
  const prompt = suggestion.prompt ?? suggestion.short;
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="text-muted-foreground"
        onClick={() => onEdit(prompt)}
      >
        Anpassen
      </Button>
      <Button size="sm" onClick={() => onSend(prompt)}>
        Starten
      </Button>
    </>
  );
}

export function MoreIdeas({
  currentId,
  onPick,
}: Readonly<{ currentId: string | null; onPick: (index: number) => void }>) {
  const ideas = SUGGESTIONS.map((idea, index) => ({ idea, index }))
    .filter(({ idea }) => idea.id !== currentId)
    .slice(0, 3);
  return (
    <div className="mt-1 flex flex-col gap-1 border-t border-border/60 pt-3">
      <span className="text-xs text-muted-foreground">Weitere Ideen</span>
      <div className="flex flex-col">
        {ideas.map(({ idea, index }) => {
          const Icon = TYPE_ICON[idea.type];
          return (
            <button
              key={idea.id}
              type="button"
              onClick={() => onPick(index)}
              className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent/60"
            >
              <Icon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{idea.short}</span>
              <ChevronRight className="ml-auto size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SuggestionCard({
  suggestion,
  onSend,
  onEdit,
  children,
}: Readonly<{
  suggestion: PlinthSuggestion;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
  children?: React.ReactNode;
}>) {
  return (
    <div
      key={suggestion.id}
      className="home-plinth__row flex flex-col gap-4 px-3 pt-2 pb-3 text-sm"
    >
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-medium">{suggestion.short}</p>
          <p className="text-xs text-muted-foreground">{suggestion.source}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SuggestionActions
            suggestion={suggestion}
            onSend={onSend}
            onEdit={onEdit}
          />
        </div>
      </div>
      {children}
    </div>
  );
}

export function FirstRoutineInvite() {
  return (
    <Link to="/routines" className="home-plinth__quiet group">
      <Plus className="size-3.5" />
      <span className="font-medium text-foreground">
        Erste Routine einrichten
      </span>
      <span className="hidden sm:inline">
        · Ayunis Core prüft jeden Morgen Ihre Quellen
      </span>
    </Link>
  );
}
