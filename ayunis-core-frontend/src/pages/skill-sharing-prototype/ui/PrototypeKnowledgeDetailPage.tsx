import { useNavigate } from '@tanstack/react-router';
import { FileText } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { EmptyState } from '@/widgets/empty-state';
import { KnowledgeBasePropertiesCard } from '@/widgets/resource-properties-card';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import { showInfo, showSuccess } from '@/shared/lib/toast';
import {
  canEditSkill,
  canReviewTarget,
  personForRole,
} from '@/widgets/sharing-prototype/model/access';
import { useKnowledgeItems } from '@/widgets/sharing-prototype/model/prototype-knowledge';
import {
  useHasPermission,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeKnowledge,
} from '@/widgets/sharing-prototype/model/types';
import { requestFor } from '@/pages/skill-sharing-prototype/lib/requests';
import { isOwnSkill } from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { useDeleteKnowledgeWithConfirmation } from '@/pages/skill-sharing-prototype/model/useDeleteKnowledgeWithConfirmation';
import { DeleteSkillButton } from './DeleteSkillButton';
import { ReadOnlyBadge } from './ReadOnlyBadge';
import { SkillAccessOverview } from './SkillAccessOverview';
import { RequestStatus, ReviewBanner, TransferButton } from './SkillTransfer';

function DocumentsCard({
  item,
  isEditable,
}: Readonly<{ item: PrototypeKnowledge; isEditable: boolean }>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Dokumente
          <Badge variant="secondary">
            <FileText />
            {item.documentCount}
          </Badge>
        </CardTitle>
        <CardDescription>
          {item.documentCount === 0
            ? 'Noch keine Dokumente in dieser Wissenssammlung.'
            : `${item.documentCount} Dokumente in dieser Wissenssammlung.`}
        </CardDescription>
        {isEditable && (
          <CardAction>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                showInfo('Dokumente lassen sich im Prototyp nicht hochladen.')
              }
            >
              Dokumente hinzufügen
            </Button>
          </CardAction>
        )}
      </CardHeader>
    </Card>
  );
}

function RequestArea({
  item,
  person,
}: Readonly<{ item: PrototypeKnowledge; person: Person }>) {
  const { role, requests } = usePrototypeState();
  const request = requestFor(requests, 'knowledge', item.id);
  if (!request) return null;
  if (request.requestedBy === person.id) {
    return <RequestStatus request={request} />;
  }
  return canReviewTarget(request.target, person, role, 'knowledge') ? (
    <ReviewBanner request={request} item={item} />
  ) : null;
}

function HeaderActions({
  item,
  person,
  isEditable,
}: Readonly<{
  item: PrototypeKnowledge;
  person: Person;
  isEditable: boolean;
}>) {
  const navigate = useNavigate();
  const { role, requests } = usePrototypeState();
  const mayManageOwn = useHasPermission(role, 'manage_own_knowledge');
  const deleteAndLeave = useDeleteKnowledgeWithConfirmation(
    () => void navigate({ to: '/knowledge-bases' }),
  );
  const canTransfer =
    isOwnSkill(item, person) && !requestFor(requests, 'knowledge', item.id);
  const canDelete = isEditable && (item.owner.kind !== 'user' || mayManageOwn);
  return (
    <>
      <HelpLink path="knowledge-collections/" />
      {canTransfer && (
        <TransferButton item={item} resource="knowledge" person={person} />
      )}
      {canDelete && <DeleteSkillButton onClick={() => deleteAndLeave(item)} />}
    </>
  );
}

function KnowledgeDetail({
  item,
  person,
}: Readonly<{ item: PrototypeKnowledge; person: Person }>) {
  const { role } = usePrototypeState();
  const isEditable = canEditSkill(item, person, role, 'knowledge');

  return (
    <ContentAreaLayout
      contentHeader={
        <ContentAreaHeader
          breadcrumbs={[
            { label: 'Wissen', href: '/knowledge-bases' },
            { label: item.name },
          ]}
          badge={isEditable ? undefined : <ReadOnlyBadge />}
          action={
            <HeaderActions
              item={item}
              person={person}
              isEditable={isEditable}
            />
          }
        />
      }
      contentArea={
        <div className="space-y-6">
          <div className="space-y-3">
            <SkillAccessOverview
              skill={item}
              resource="knowledge"
              person={person}
            />
            <RequestArea item={item} person={person} />
          </div>
          {isEditable && (
            <KnowledgeBasePropertiesCard
              key={item.id}
              knowledgeBase={{ name: item.name, description: item.description }}
              onUpdate={() => {
                showSuccess('Änderungen gespeichert.');
                return Promise.resolve();
              }}
            />
          )}
          <DocumentsCard item={item} isEditable={isEditable} />
        </div>
      }
    />
  );
}

export function PrototypeKnowledgeDetailPage({
  itemId,
}: Readonly<{ itemId: string }>) {
  const { role } = usePrototypeState();
  const item = useKnowledgeItems().find((candidate) => candidate.id === itemId);
  const person = personForRole(role);

  return (
    <AppLayout>
      {item ? (
        <KnowledgeDetail item={item} person={person} />
      ) : (
        <ContentAreaLayout
          contentHeader={
            <ContentAreaHeader
              breadcrumbs={[{ label: 'Wissen', href: '/knowledge-bases' }]}
            />
          }
          contentArea={
            <EmptyState
              title="Diese Wissenssammlung gibt es im Prototyp nicht"
              description="Öffnen Sie eine Wissenssammlung aus der Liste."
            />
          }
        />
      )}
    </AppLayout>
  );
}
