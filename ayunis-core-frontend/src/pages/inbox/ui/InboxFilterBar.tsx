import { ListFilter } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import { cn } from '@ayunis/ui/lib/cn';
import { NotificationTypeIcon } from '@/features/notifications';
import type { NotificationType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

const INBOX_TYPES: { type: NotificationType; label: string }[] = [
  { type: 'routine', label: 'Ergebnisse aus Routinen' },
  { type: 'routine_error', label: 'Fehlgeschlagene Routinen' },
];

interface InboxFilterBarProps {
  hiddenTypes: ReadonlySet<NotificationType>;
  onlyUnread: boolean;
  onToggleType: (type: NotificationType) => void;
  onShowAll: () => void;
  onOnlyUnread: (value: boolean) => void;
}

export function InboxFilterBar({
  hiddenTypes,
  onlyUnread,
  onToggleType,
  onShowAll,
  onOnlyUnread,
}: Readonly<InboxFilterBarProps>) {
  const hiddenCount = hiddenTypes.size;
  return (
    <div className="flex items-center gap-1 px-1 pb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 px-2 text-xs font-normal',
              hiddenCount > 0 ? 'text-foreground' : 'text-muted-foreground',
            )}
          >
            <ListFilter />
            Filter
            {hiddenCount > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums">
                {INBOX_TYPES.length - hiddenCount}/{INBOX_TYPES.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Anzeigen
          </DropdownMenuLabel>
          {INBOX_TYPES.map((entry) => (
            <DropdownMenuCheckboxItem
              key={entry.type}
              checked={!hiddenTypes.has(entry.type)}
              onCheckedChange={() => onToggleType(entry.type)}
              onSelect={(event) => event.preventDefault()}
            >
              <NotificationTypeIcon type={entry.type} className="size-4" />
              {entry.label}
            </DropdownMenuCheckboxItem>
          ))}
          {hiddenCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onShowAll}>
                Alles anzeigen
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={onlyUnread}
        onClick={() => onOnlyUnread(!onlyUnread)}
        className={cn(
          'h-8 px-2 text-xs font-normal',
          onlyUnread ? 'bg-accent text-foreground' : 'text-muted-foreground',
        )}
      >
        Nur ungelesene
      </Button>
    </div>
  );
}
