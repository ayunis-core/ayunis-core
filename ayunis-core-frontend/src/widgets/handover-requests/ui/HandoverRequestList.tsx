import { useNavigate } from '@tanstack/react-router';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  HandoverDecisionButtons,
  useHandoverCopy,
  useReviewableHandovers,
  type HandoverKind,
  type HandoverRequest,
} from '@/features/resource-handover';
import { EmptyState } from '@/widgets/empty-state';
import { ListSection } from '@/shared/ui/list-section/ListSection';
import {
  requestSections,
  type RequestSection,
} from '@/widgets/handover-requests/lib/request-sections';

function RequestRow({
  kind,
  request,
}: Readonly<{ kind: HandoverKind; request: HandoverRequest }>) {
  const { t, date } = useHandoverCopy(kind);
  const navigate = useNavigate();
  const openItem = () =>
    void navigate(
      kind === 'skill'
        ? { to: '/skills/$id', params: { id: request.resource.id } }
        : { to: '/knowledge-bases/$id', params: { id: request.resource.id } },
    );

  return (
    <Item
      variant="outline"
      className="cursor-pointer"
      onClick={openItem}
      data-testid={`handover-request-${request.id}`}
    >
      <ItemContent>
        <ItemTitle>{request.resource.name}</ItemTitle>
        <ItemDescription>
          {t('requests.row', {
            name: request.requestedBy.name,
            date: date(request.requestedAt),
          })}
        </ItemDescription>
      </ItemContent>
      <ItemActions onClick={(event) => event.stopPropagation()}>
        <HandoverDecisionButtons kind={kind} request={request} />
      </ItemActions>
    </Item>
  );
}

function RequestRows({
  kind,
  requests,
}: Readonly<{ kind: HandoverKind; requests: HandoverRequest[] }>) {
  return (
    <ItemGroup className="gap-2">
      {requests.map((request) => (
        <RequestRow key={request.id} kind={kind} request={request} />
      ))}
    </ItemGroup>
  );
}

function GroupedRequests({
  kind,
  sections,
}: Readonly<{ kind: HandoverKind; sections: RequestSection[] }>) {
  const { t } = useHandoverCopy(kind);
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <ListSection
          key={section.key}
          title={
            section.teamName === null
              ? t('requests.groupOrg')
              : t('requests.groupTeam', { team: section.teamName })
          }
          count={section.requests.length}
        >
          {section.requests.map((request) => (
            <RequestRow key={request.id} kind={kind} request={request} />
          ))}
        </ListSection>
      ))}
    </div>
  );
}

export function HandoverRequestList({
  kind,
}: Readonly<{ kind: HandoverKind }>) {
  const { t } = useHandoverCopy(kind);
  const { requests, isLoading } = useReviewableHandovers(kind, true);
  if (isLoading) return null;
  if (requests.length === 0) {
    return (
      <EmptyState
        title={t('requests.emptyTitle')}
        description={t(`requests.emptyDescription.${kind}`)}
        testId="handover-requests-empty"
      />
    );
  }
  const sections = requestSections(requests);
  return sections.length > 1 ? (
    <GroupedRequests kind={kind} sections={sections} />
  ) : (
    <RequestRows kind={kind} requests={requests} />
  );
}
