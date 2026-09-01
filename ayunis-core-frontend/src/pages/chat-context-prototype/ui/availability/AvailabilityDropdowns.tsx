import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Database, Sparkles } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@ayunis/ui/components/popover';
import { Separator } from '@ayunis/ui/components/separator';
import { showInfo } from '@/shared/lib/toast';
import {
  plural,
  type AvailabilityEntry,
} from '@/pages/chat-context-prototype/model/useAvailability';

interface EntryPopoverProps {
  label: string;
  eyebrow: string;
  hint: string;
  entries: AvailabilityEntry[];
  manageTo: '/skills' | '/knowledge-bases';
  manageLabel: string;
  icon: 'skill' | 'knowledge';
}

function EntryPopover({
  label,
  eyebrow,
  hint,
  entries,
  manageTo,
  manageLabel,
  icon,
}: Readonly<EntryPopoverProps>) {
  if (entries.length === 0) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          {icon === 'skill' ? <Sparkles /> : <Database />}
          {label}
          <ChevronDown />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex flex-col gap-3">
          <AvailabilityNote title={eyebrow}>{hint}</AvailabilityNote>
          <Separator />
          <AvailabilityEntryList entries={entries} />
          <Separator />
          <Link
            to={manageTo}
            className="text-xs text-muted-foreground underline underline-offset-4"
          >
            {manageLabel}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AvailabilityNote({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Alert className="border-transparent bg-brand/8">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}

export function AvailabilityEntryList({
  entries,
}: Readonly<{ entries: AvailabilityEntry[] }>) {
  return (
    <ul className="flex flex-col">
      {entries.slice(0, 5).map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            onClick={() => showInfo(`Detailseite von „${entry.name}“`)}
            className="-mx-2 flex w-[calc(100%+1rem)] items-center rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
          >
            <span className="min-w-0 flex-1 truncate">{entry.name}</span>
          </button>
        </li>
      ))}
      {entries.length > 5 && (
        <li className="px-0 pt-1.5 text-xs text-muted-foreground">
          und {entries.length - 5} weitere
        </li>
      )}
    </ul>
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
      <EntryPopover
        icon="skill"
        label={plural(skills.length, 'Fähigkeit', 'Fähigkeiten')}
        eyebrow="Wird automatisch aktiviert"
        hint="Sobald Ihre Nachricht dazu passt — ohne Auswahl."
        entries={skills}
        manageTo="/skills"
        manageLabel="Fähigkeiten verwalten"
      />
      <EntryPopover
        icon="knowledge"
        label={plural(
          knowledgeBases.length,
          'Wissensdatenbank',
          'Wissensdatenbanken',
        )}
        eyebrow="Wird bei Bedarf durchsucht"
        hint="Ayunis Core sucht selbst, wenn die Frage dazu passt."
        entries={knowledgeBases}
        manageTo="/knowledge-bases"
        manageLabel="Wissen verwalten"
      />
    </div>
  );
}
