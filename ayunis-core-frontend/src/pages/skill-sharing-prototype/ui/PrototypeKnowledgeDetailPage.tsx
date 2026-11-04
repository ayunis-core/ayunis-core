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
  canUseSkill,
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
import { documentCountLabel } from '@/pages/skill-sharing-prototype/lib/document-count';
import { requestFor } from '@/pages/skill-sharing-prototype/lib/requests';
import { isOwnSkill } from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { useDeleteKnowledgeWithConfirmation } from '@/pages/skill-sharing-prototype/model/useDeleteKnowledgeWithConfirmation';
import { KnowledgeActiveSwitch } from './ActiveSwitch';
import { DeleteSkillButton } from './DeleteSkillButton';
import { ItemSharePanel } from './ItemSharePanel';
import { LinkedWorkspacesSection } from './LinkedWorkspacesSection';
import { OwnItemTabs, type OwnItemTab } from './OwnItemTabs';
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
            : `${documentCountLabel(item.documentCount)} in dieser Wissenssammlung.`}
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
  const { role, requests, iteration } = usePrototypeState();
  const request = requestFor(requests, 'knowledge', item.id);
  if (!request || iteration === 1) return null;
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
  const { role, requests, iteration } = usePrototypeState();
  const mayManageOwn = useHasPermission(role, 'manage_own_knowledge');
  const deleteAndLeave = useDeleteKnowledgeWithConfirmation(
    () => void navigate({ to: '/knowledge-bases' }),
  );
  const canTransfer =
    iteration === 2 &&
    isOwnSkill(item, person) &&
    !requestFor(requests, 'knowledge', item.id);
  const canDelete = isEditable && (item.owner.kind !== 'user' || mayManageOwn);
  return (
    <>
      <HelpLink path="knowledge-collections/" />
      {canUseSkill(item, person, 'knowledge') && (
        <KnowledgeActiveSwitch knowledgeId={item.id} />
      )}
      {canTransfer && (
        <TransferButton item={item} resource="knowledge" person={person} />
      )}
      {canDelete && <DeleteSkillButton onClick={() => deleteAndLeave(item)} />}
    </>
  );
}

function KnowledgeBody({
  item,
  isEditable,
}: Readonly<{ item: PrototypeKnowledge; isEditable: boolean }>) {
  return (
    <>
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
    </>
  );
}

function KnowledgeMain({
  item,
  person,
  isEditable,
  initialTab,
}: Readonly<{
  item: PrototypeKnowledge;
  person: Person;
  isEditable: boolean;
  initialTab?: OwnItemTab;
}>) {
  const { iteration } = usePrototypeState();
  const body = <KnowledgeBody item={item} isEditable={isEditable} />;
  if (iteration === 2 || !isOwnSkill(item, person)) return body;
  return (
    <OwnItemTabs
      initialTab={initialTab}
      config={body}
      share={
        <ItemSharePanel item={item} resource="knowledge" person={person} />
      }
    />
  );
}

function KnowledgeDetail({
  item,
  person,
  initialTab,
}: Readonly<{
  item: PrototypeKnowledge;
  person: Person;
  initialTab?: OwnItemTab;
}>) {
  const { role, iteration } = usePrototypeState();
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
          <KnowledgeMain
            item={item}
            person={person}
            isEditable={isEditable}
            initialTab={initialTab}
          />
          {iteration === 2 && item.owner.kind !== 'workspace' && (
            <LinkedWorkspacesSection
              resource="knowledge"
              itemId={item.id}
              person={person}
            />
          )}
        </div>
      }
    />
  );
}

export function PrototypeKnowledgeDetailPage({
  itemId,
  initialTab,
}: Readonly<{ itemId: string; initialTab?: OwnItemTab }>) {
  const { role } = usePrototypeState();
  const item = useKnowledgeItems().find((candidate) => candidate.id === itemId);
  const person = personForRole(role);

  return (
    <AppLayout>
      {item ? (
        <KnowledgeDetail item={item} person={person} initialTab={initialTab} />
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
