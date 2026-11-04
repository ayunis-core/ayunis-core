import { Link } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ayunis/ui/components/table';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';

interface Home {
  owner: string;
  createdBy: string;
  usableBy: string;
  editableBy: string;
}

const HOMES: Home[] = [
  {
    owner: 'Organisation',
    createdBy:
      'Admins, per Anfrage von Mitgliedern, oder Ayunis für die Kommune',
    usableBy: 'Alle in der Organisation',
    editableBy: 'Admins',
  },
  {
    owner: 'Team',
    createdBy: 'Team-Admins, oder per Anfrage von Mitgliedern',
    usableBy: 'Alle im Team',
    editableBy: 'Team-Admins',
  },
  {
    owner: 'Person',
    createdBy: 'Jede Person',
    usableBy: 'Nur sie selbst',
    editableBy: 'Nur sie',
  },
  {
    owner: 'Arbeitsbereich',
    createdBy: 'Wer ihn bearbeiten kann',
    usableBy: 'Alle Mitglieder',
    editableBy: 'Wer ihn bearbeiten kann',
  },
];

const ITERATION_1_HOMES: Home[] = [
  {
    owner: 'Organisation',
    createdBy: 'Admins und alle mit dem Recht dazu',
    usableBy: 'Alle in der Organisation',
    editableBy: 'Admins und alle mit dem Recht dazu',
  },
  {
    owner: 'Team',
    createdBy: 'Team-Admins',
    usableBy: 'Alle im Team',
    editableBy: 'Team-Admins und Admins',
  },
  {
    owner: 'Person',
    createdBy: 'Jede Person',
    usableBy: 'Sie selbst und alle, mit denen sie teilt',
    editableBy: 'Nur sie',
  },
];

const SHARE_FLOW = [
  'Eine Person erstellt eine Fähigkeit. Sie gehört ihr.',
  'Sie teilt sie im Tab „Freigaben“ mit ihren Teams oder der Organisation, wenn ihre Rolle das erlaubt.',
  'Alle, mit denen sie geteilt ist, finden sie unter „Team und Organisation“ bei „Mit Ihnen geteilt“. Ändern kann sie weiterhin nur die Person.',
];

const REQUEST_FLOW = [
  'Eine Person erstellt eine Fähigkeit. Nur sie nutzt sie.',
  'Sie fragt an, die Fähigkeit an ihr Team oder an die Organisation zu übergeben.',
  'Beim Team gibt der Team-Admin oder ein Admin frei, bei der Organisation ein Admin.',
  'Nach der Freigabe gehört sie dem Team oder der Organisation. Die Person bleibt als „Eingereicht von“ sichtbar, ändern kann sie nicht mehr.',
];

const WORKSPACE_FLOW = [
  'Eine Fähigkeit gehört einer Person, einem Team oder der Organisation.',
  'Wer den Arbeitsbereich bearbeiten kann, verknüpft sie dort.',
  'Alle Mitglieder nutzen sie. Ändern kann sie weiterhin nur, wem sie gehört.',
];

function HomesTable({ homes }: Readonly<{ homes: Home[] }>) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Gehört</TableHead>
            <TableHead>Erstellt von</TableHead>
            <TableHead>Nutzbar für</TableHead>
            <TableHead>Ändern kann</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {homes.map((home) => (
            <TableRow key={home.owner}>
              <TableCell className="font-medium">{home.owner}</TableCell>
              <TableCell>{home.createdBy}</TableCell>
              <TableCell className="whitespace-normal">
                {home.usableBy}
              </TableCell>
              <TableCell>{home.editableBy}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function Flow({ title, steps }: Readonly<{ title: string; steps: string[] }>) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        {steps.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ol>
    </section>
  );
}

function ModelContent() {
  const { iteration } = usePrototypeState();
  if (iteration === 1) {
    return (
      <>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">So funktioniert es</h1>
          <p className="text-muted-foreground">
            Jede Fähigkeit gehört einer Person, einem Team oder der
            Organisation. Wem sie gehört, bestimmt, wer sie nutzen und ändern
            kann. Eigene Fähigkeiten lassen sich weiter teilen.
          </p>
        </div>
        <HomesTable homes={ITERATION_1_HOMES} />
        <Flow title="Teilen" steps={SHARE_FLOW} />
      </>
    );
  }
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">So funktioniert es</h1>
        <p className="text-muted-foreground">
          Jede Fähigkeit gehört genau einer Stelle. Wem sie gehört, bestimmt,
          wer sie nutzen kann. Direkt geteilt wird nicht mehr.
        </p>
      </div>
      <HomesTable homes={HOMES} />
      <Flow title="Übergeben" steps={REQUEST_FLOW} />
      <Flow title="Im Arbeitsbereich" steps={WORKSPACE_FLOW} />
    </>
  );
}

export function PrototypeModelPage() {
  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[
              { label: 'Fähigkeiten', href: '/skills' },
              { label: 'So funktioniert es' },
            ]}
          />
        }
        contentArea={
          <div className="space-y-8">
            <ModelContent />
            <Button variant="outline" asChild>
              <Link to="/skills">Zu den Fähigkeiten</Link>
            </Button>
          </div>
        }
      />
    </AppLayout>
  );
}
