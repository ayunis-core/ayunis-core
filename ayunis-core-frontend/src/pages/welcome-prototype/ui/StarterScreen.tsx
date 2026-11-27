import { Fragment } from 'react';
import {
  CalendarClock,
  Plug,
  Sparkles,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { Checkbox } from '@ayunis/ui/components/checkbox';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { usePickedSet } from '@/pages/welcome-prototype/model/use-picked-set';
import { ScreenShell } from './ScreenShell';

const GROUPS: ReadonlyArray<{
  title: string;
  icon: LucideIcon;
  items: ReadonlyArray<{ name: string; description: string }>;
}> = [
  {
    title: 'Fähigkeiten',
    icon: Sparkles,
    items: [
      {
        name: 'Bürgeranfragen beantworten',
        description: 'Verständliche Antworten im Ton Ihrer Verwaltung',
      },
      {
        name: 'Dokumente zusammenfassen',
        description: 'Das Wichtigste aus langen Unterlagen',
      },
    ],
  },
  {
    title: 'Routinen',
    icon: CalendarClock,
    items: [
      {
        name: 'Neue Förderprogramme',
        description: 'Jeden Montag in Ihrem Posteingang',
      },
    ],
  },
  {
    title: 'Integrationen',
    icon: Plug,
    items: [
      {
        name: 'Ayunis Core in Outlook',
        description: 'E-Mails direkt in Outlook beantworten',
      },
    ],
  },
];

function nextLabel(count: number) {
  if (count === 0) return 'Weiter';
  return count === 1 ? '1 hinzufügen' : `${count} hinzufügen`;
}

export function StarterScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  const { picked, toggle } = usePickedSet(() => []);

  return (
    <ScreenShell
      title="Womit möchten Sie direkt starten?"
      hint="Ein paar Vorschläge für den Anfang. Sie können alles später ändern."
      nextLabel={nextLabel(picked.size)}
      onNext={onDone}
      onBack={onBack}
    >
      <div className="flex w-[36rem] max-w-full flex-col gap-4 text-left">
        <ItemGroup className="bg-background rounded-xl border">
          {GROUPS.map((group, groupIndex) => (
            <Fragment key={group.title}>
              {groupIndex > 0 && <ItemSeparator />}
              <span className="text-muted-foreground px-4 pt-3 text-xs">
                {group.title}
              </span>
              {group.items.map((item) => (
                <Item
                  key={item.name}
                  size="sm"
                  className="rounded-none"
                  asChild
                >
                  <label className="cursor-pointer">
                    <ItemMedia variant="icon">
                      <group.icon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{item.name}</ItemTitle>
                      <ItemDescription>{item.description}</ItemDescription>
                    </ItemContent>
                    <Checkbox
                      checked={picked.has(item.name)}
                      onCheckedChange={(value) =>
                        toggle(item.name, value === true)
                      }
                    />
                  </label>
                </Item>
              ))}
            </Fragment>
          ))}
        </ItemGroup>
        <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
          <Store className="size-4" />
          Weitere finden Sie jederzeit im Marketplace.
        </p>
      </div>
    </ScreenShell>
  );
}
