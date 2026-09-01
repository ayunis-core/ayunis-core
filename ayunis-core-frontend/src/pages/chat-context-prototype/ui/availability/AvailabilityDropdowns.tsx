import { Link } from '@tanstack/react-router';
import { ChevronDown, Database, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { showInfo } from '@/shared/lib/toast';
import {
  plural,
  type AvailabilityEntry,
} from '@/pages/chat-context-prototype/model/useAvailability';

interface EntryMenuProps {
  label: string;
  hint: string;
  entries: AvailabilityEntry[];
  manageTo: '/skills' | '/knowledge-bases';
  manageLabel: string;
  icon: 'skill' | 'knowledge';
}

export function EntryMenu({
  label,
  hint,
  entries,
  manageTo,
  manageLabel,
  icon,
}: Readonly<EntryMenuProps>) {
  if (entries.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          {icon === 'skill' ? <Sparkles /> : <Database />}
          {label}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {hint}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {entries.slice(0, 6).map((entry) => (
          <DropdownMenuItem
            key={entry.id}
            onClick={() => showInfo(`Detailseite von „${entry.name}“`)}
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate">{entry.name}</span>
              {entry.description && (
                <span className="truncate text-xs text-muted-foreground">
                  {entry.description}
                </span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={manageTo}>{manageLabel}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AvailabilityDropdowns({
  skills,
  knowledgeBases,
}: Readonly<{
  skills: AvailabilityEntry[];
  knowledgeBases: AvailabilityEntry[];
}>) {
  return (
    <div className="flex items-center gap-1">
      <EntryMenu
        icon="skill"
        label={plural(skills.length, 'Fähigkeit', 'Fähigkeiten')}
        hint="Ayunis Core wählt passend zu Ihrer Nachricht aus."
        entries={skills}
        manageTo="/skills"
        manageLabel="Fähigkeiten verwalten"
      />
      <EntryMenu
        icon="knowledge"
        label={plural(
          knowledgeBases.length,
          'Wissensdatenbank',
          'Wissensdatenbanken',
        )}
        hint="Wird im Hintergrund durchsucht, wenn es zur Frage passt."
        entries={knowledgeBases}
        manageTo="/knowledge-bases"
        manageLabel="Wissen verwalten"
      />
    </div>
  );
}
