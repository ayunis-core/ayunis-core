import { useNavigate } from '@tanstack/react-router';
import { Inbox } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import { allTeams, findPerson } from '@/widgets/sharing-prototype/model/access';
import { useKnowledgeItems } from '@/widgets/sharing-prototype/model/prototype-knowledge';
import { usePrototypeSkills } from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  OwnedItem,
  ResourceKind,
  TransferRequest,
} from '@/widgets/sharing-prototype/model/types';
import {
  approveTransferRequest,
  rejectTransferRequest,
} from '@/pages/skill-sharing-prototype/lib/requests';
import { EmptyHint } from './EmptyHint';
import { ListRow } from './ListRow';
import { SkillPanelSection } from './SkillPanelSection';

function useOpenItem(): (request: TransferRequest) => void {
  const navigate = useNavigate();
  return (request) => {
    if (request.resource === 'knowledge') {
      void navigate({
        to: '/knowledge-bases/$id',
        params: { id: request.itemId },
      });
      return;
    }
    void navigate({ to: '/skills/$id', params: { id: request.itemId } });
  };
}

function RequestRow({
  request,
  item,
}: Readonly<{
  request: TransferRequest;
  item: OwnedItem;
}>) {
  const openItem = useOpenItem();
  return (
    <ListRow
      title={item.name}
      description={`Von ${findPerson(request.requestedBy).name} · ${request.requestedAt}`}
      onClick={() => openItem(request)}
      actions={
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => rejectTransferRequest(request, item.name)}
          >
            Ablehnen
          </Button>
          <Button
            size="sm"
            onClick={() => approveTransferRequest(request, item.name)}
          >
            Freigeben
          </Button>
        </>
      }
    />
  );
}

interface RequestEntry {
  request: TransferRequest;
  item: OwnedItem;
}

function RequestRows({ entries }: Readonly<{ entries: RequestEntry[] }>) {
  return (
    <>
      {entries.map(({ request, item }) => (
        <RequestRow key={item.id} request={request} item={item} />
      ))}
    </>
  );
}

function requestSections(entries: RequestEntry[]) {
  const org = {
    key: 'org',
    title: 'Organisation',
    entries: entries.filter(({ request }) => request.target.kind === 'org'),
  };
  const teams = allTeams().map((team) => ({
    key: team.id,
    title: `Team ${team.name}`,
    entries: entries.filter(
      ({ request }) =>
        request.target.kind === 'team' && request.target.teamId === team.id,
    ),
  }));
  return [org, ...teams].filter((section) => section.entries.length > 0);
}

function GroupedRequests({ entries }: Readonly<{ entries: RequestEntry[] }>) {
  return (
    <div className="space-y-6">
      {requestSections(entries).map((section) => (
        <SkillPanelSection
          key={section.key}
          title={section.title}
          count={section.entries.length}
        >
          <RequestRows entries={section.entries} />
        </SkillPanelSection>
      ))}
    </div>
  );
}

const EMPTY_DESCRIPTION: Record<ResourceKind, string> = {
  skill:
    'Hier erscheinen Fähigkeiten, die Mitarbeitende an ein Team oder die Organisation übergeben möchten.',
  knowledge:
    'Hier erscheinen Wissenssammlungen, die Mitarbeitende an ein Team oder die Organisation übergeben möchten.',
};

export function TransferRequestList({
  requests,
  resource,
  isGrouped,
}: Readonly<{
  requests: TransferRequest[];
  resource: ResourceKind;
  isGrouped: boolean;
}>) {
  const skills = usePrototypeSkills();
  const knowledge = useKnowledgeItems();
  const items: OwnedItem[] = resource === 'skill' ? skills : knowledge;
  const entries = requests.flatMap((request) => {
    const item = items.find((candidate) => candidate.id === request.itemId);
    return item ? [{ request, item }] : [];
  });
  if (entries.length === 0) {
    return (
      <EmptyHint
        icon={<Inbox />}
        title="Keine offenen Anfragen"
        description={EMPTY_DESCRIPTION[resource]}
      />
    );
  }
  if (isGrouped) return <GroupedRequests entries={entries} />;
  return (
    <ItemGroup className="gap-2">
      <RequestRows entries={entries} />
    </ItemGroup>
  );
}
