import { useNavigate } from '@tanstack/react-router';
import { Inbox } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { findPerson, findTeam } from '@/widgets/sharing-prototype/model/access';
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

function targetLabel(request: TransferRequest): string {
  return request.target.kind === 'org'
    ? 'an die Organisation'
    : `an Team ${findTeam(request.target.teamId).name}`;
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
      description={`Von ${findPerson(request.requestedBy).name} ${targetLabel(request)} · ${request.requestedAt}`}
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

const EMPTY_DESCRIPTION: Record<ResourceKind, string> = {
  skill:
    'Hier erscheinen Fähigkeiten, die Mitarbeitende an ein Team oder die Organisation übergeben möchten.',
  knowledge:
    'Hier erscheinen Wissenssammlungen, die Mitarbeitende an ein Team oder die Organisation übergeben möchten.',
};

export function TransferRequestList({
  requests,
  resource,
}: Readonly<{
  requests: TransferRequest[];
  resource: ResourceKind;
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
  return (
    <SkillPanelSection title="Offene Anfragen" count={entries.length}>
      {entries.map(({ request, item }) => (
        <RequestRow key={item.id} request={request} item={item} />
      ))}
    </SkillPanelSection>
  );
}
