import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BookOpen } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ListToolbar, ListToolbarSearch } from '@/widgets/list-toolbar';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  personForRole,
  reviewableTeamIds,
} from '@/widgets/sharing-prototype/model/access';
import { useKnowledgeItems } from '@/widgets/sharing-prototype/model/prototype-knowledge';
import { sharedTargetFor } from '@/widgets/sharing-prototype/model/prototype-shares';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeKnowledge,
} from '@/widgets/sharing-prototype/model/types';
import { documentCountLabel } from '@/pages/skill-sharing-prototype/lib/document-count';
import {
  filterOptions,
  listSections,
  resolveFilter,
  type ListFilter,
} from '@/pages/skill-sharing-prototype/lib/list-sections';
import { ownerOptionsFor } from '@/pages/skill-sharing-prototype/lib/owner-options';
import { reviewableRequests } from '@/pages/skill-sharing-prototype/lib/requests';
import { sharedSkillLabel } from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { CreateKnowledgeItemDialog } from './CreateKnowledgeItemDialog';
import { EmptyHint } from './EmptyHint';
import { KnowledgeActiveSwitch } from './ActiveSwitch';
import { ListFilterSelect } from './ListFilterSelect';
import { ListRow } from './ListRow';
import { SectionedList } from './SectionedList';
import { TransferRequestList } from './TransferRequestList';

function matches(item: PrototypeKnowledge, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${item.name} ${item.description}`.toLowerCase().includes(needle);
}

function KnowledgeRow({
  item,
  label,
}: Readonly<{
  item: PrototypeKnowledge;
  label?: string | null;
}>) {
  const navigate = useNavigate();
  return (
    <ListRow
      title={item.name}
      description={`${item.description} · ${documentCountLabel(item.documentCount)}`}
      onClick={() =>
        void navigate({ to: '/knowledge-bases/$id', params: { id: item.id } })
      }
      actions={
        <>
          {label && (
            <span className="text-sm text-muted-foreground">{label}</span>
          )}
          <KnowledgeActiveSwitch knowledgeId={item.id} />
        </>
      }
    />
  );
}

function useKnowledgeList(person: Person) {
  const state = usePrototypeState();
  const items = [...useKnowledgeItems()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const sharedTargetOf = (item: PrototypeKnowledge) =>
    sharedTargetFor(state, item, 'knowledge', person);
  const canReview =
    state.iteration === 2 &&
    reviewableTeamIds(person, state.role, 'knowledge').length > 0;
  return {
    canReview,
    inbox: reviewableRequests(state.requests, 'knowledge', person, state.role),
    options: filterOptions(
      listSections(items, person, sharedTargetOf),
      canReview,
    ),
    sectionsFor: (query: string) =>
      listSections(
        items.filter((item) => matches(item, query)),
        person,
        sharedTargetOf,
      ),
  };
}

type KnowledgeList = ReturnType<typeof useKnowledgeList>;

function KnowledgeContent({
  person,
  filter,
  query,
  list,
}: Readonly<{
  person: Person;
  filter: ListFilter;
  query: string;
  list: KnowledgeList;
}>) {
  const showRequests =
    list.canReview &&
    (filter === 'requests' ||
      (filter === 'all' && !query && list.inbox.length > 0));

  return (
    <SectionedList
      sections={list.sectionsFor(query)}
      filter={filter}
      query={query}
      requests={
        showRequests ? (
          <TransferRequestList requests={list.inbox} resource="knowledge" />
        ) : undefined
      }
      ownEmpty={
        <EmptyHint
          icon={<BookOpen />}
          title="Noch keine eigenen Wissenssammlungen"
        />
      }
      notFoundTitle="Keine Wissenssammlung gefunden"
      renderRow={(item) => (
        <KnowledgeRow item={item} label={sharedSkillLabel(item, person)} />
      )}
    />
  );
}

export function PrototypeKnowledgePage({
  initialFilter = 'all',
}: Readonly<{ initialFilter?: ListFilter }>) {
  const { role } = usePrototypeState();
  const person = personForRole(role);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const list = useKnowledgeList(person);
  const shownFilter = resolveFilter(filter, list.options);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: 'Wissen' }]}
            action={
              <ListToolbar>
                <ListToolbarSearch
                  placeholder="Wissen durchsuchen"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <ListFilterSelect
                  value={shownFilter}
                  options={list.options}
                  onChange={setFilter}
                />
                <HelpLink path="knowledge-collections/" />
                <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                  Wissenssammlung erstellen
                </Button>
              </ListToolbar>
            }
          />
        }
        contentArea={
          <>
            <KnowledgeContent
              person={person}
              filter={shownFilter}
              query={query}
              list={list}
            />
            <CreateKnowledgeItemDialog
              key={isCreateOpen ? `open-${role}` : 'closed'}
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              options={ownerOptionsFor(person, role, 'knowledge')}
              onCreated={() => setFilter('all')}
            />
          </>
        }
      />
    </AppLayout>
  );
}
