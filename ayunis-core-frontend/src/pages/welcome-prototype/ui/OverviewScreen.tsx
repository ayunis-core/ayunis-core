import {
  BarChart3,
  Check,
  ChevronRight,
  FolderOpen,
  GraduationCap,
  KeyRound,
  Plug,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ScreenShell } from './ScreenShell';

const DONE = [
  '11 Modelle freigeschaltet',
  'Modus Auto als Standard',
  'Recherche im Internet erlaubt',
  'Organisationsanweisung',
  'Ihr Profil',
  'Fähigkeit: Bauanträge vorprüfen',
  'Routine: Überblick neuer Bürgeranfragen',
];

const NEXT: ReadonlyArray<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: UserPlus,
    title: 'Kolleginnen und Kollegen einladen',
    description: 'Alles ist vorbereitet',
  },
  {
    icon: Plug,
    title: 'Integrationen verbinden',
    description: 'Zum Beispiel Outlook oder das Ratsinformationssystem',
  },
  {
    icon: FolderOpen,
    title: 'Ersten Arbeitsbereich anlegen',
    description: 'Ein Ort pro Thema, gemeinsam im Team',
  },
  {
    icon: KeyRound,
    title: 'Zwei-Faktor-Anmeldung einrichten',
    description: 'Schützt Ihr Admin-Konto',
  },
  {
    icon: GraduationCap,
    title: 'Academy entdecken',
    description: 'Kurze Kurse für Ihr Team',
  },
];

export function OverviewScreen({
  onDone,
  onBack,
}: Readonly<{ onDone: () => void; onBack: () => void }>) {
  return (
    <ScreenShell
      title="Ihre Verwaltung auf einen Blick."
      nextLabel="Loslegen"
      onNext={onDone}
      onBack={onBack}
    >
      <div className="flex w-[56rem] max-w-full flex-col gap-4 text-left">
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Eingerichtet</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2.5 text-sm">
                {DONE.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <Check className="text-brand size-4" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-background">
            <CardHeader>
              <CardTitle>Als Nächstes</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-2">
              {NEXT.map((step) => (
                <Item key={step.title} size="sm" asChild>
                  <button type="button" className="text-left">
                    <ItemMedia variant="icon">
                      <step.icon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{step.title}</ItemTitle>
                      <ItemDescription>{step.description}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <ChevronRight className="text-muted-foreground size-4" />
                    </ItemActions>
                  </button>
                </Item>
              ))}
            </CardContent>
          </Card>
        </div>
        <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
          <BarChart3 className="size-4" />
          Verbrauch und Credits sehen Sie jederzeit unter „Nutzung“.
        </p>
      </div>
    </ScreenShell>
  );
}
