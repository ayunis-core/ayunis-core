import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ListToolbar, ListToolbarSearch } from '@/widgets/list-toolbar';
import {
  personForRole,
  reviewableTeamIds,
} from '@/widgets/sharing-prototype/model/access';
import { sharedTargetFor } from '@/widgets/sharing-prototype/model/prototype-shares';
import {
  useHasPermission,
  usePrototypeSkills,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeSkill,
} from '@/widgets/sharing-prototype/model/types';
import {
  filterOptions,
  listSections,
  resolveFilter,
  type ListFilter,
} from '@/pages/skill-sharing-prototype/lib/list-sections';
import { ownerOptionsFor } from '@/pages/skill-sharing-prototype/lib/owner-options';
import { reviewableRequests } from '@/pages/skill-sharing-prototype/lib/requests';
import { sharedSkillLabel } from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { CreateSkillDialog } from './CreateSkillDialog';
import { CreateSkillMenu } from './CreateSkillMenu';
import { ListFilterSelect } from './ListFilterSelect';
import { MarketplacePromoBanner } from './MarketplacePromoBanner';
import { SectionedList } from './SectionedList';
import { SkillListRow } from './SkillListRow';
import { SkillStarterCard } from './SkillStarterCard';
import { TransferRequestList } from './TransferRequestList';

function matches(skill: PrototypeSkill, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${skill.name} ${skill.shortDescription}`
    .toLowerCase()
    .includes(needle);
}

function useSkillList(person: Person) {
  const state = usePrototypeState();
  const skills = [...usePrototypeSkills()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const sharedTargetOf = (skill: PrototypeSkill) =>
    sharedTargetFor(state, skill, 'skill', person);
  const canReview =
    state.iteration === 2 &&
    reviewableTeamIds(person, state.role, 'skill').length > 0;
  return {
    canReview,
    inbox: reviewableRequests(state.requests, 'skill', person, state.role),
    options: filterOptions(
      listSections(skills, person, sharedTargetOf),
      canReview,
    ),
    sectionsFor: (query: string) =>
      listSections(
        skills.filter((skill) => matches(skill, query)),
        person,
        sharedTargetOf,
      ),
  };
}

type SkillList = ReturnType<typeof useSkillList>;

function SkillsContent({
  person,
  filter,
  query,
  list,
}: Readonly<{
  person: Person;
  filter: ListFilter;
  query: string;
  list: SkillList;
}>) {
  const { role } = usePrototypeState();
  const navigate = useNavigate();
  const mayUseMarketplace = useHasPermission(
    role,
    'install_marketplace_skills',
  );
  const showRequests =
    list.canReview &&
    (filter === 'requests' ||
      (filter === 'all' && !query && list.inbox.length > 0));

  return (
    <div className="space-y-4">
      {mayUseMarketplace && <MarketplacePromoBanner />}
      <SectionedList
        sections={list.sectionsFor(query)}
        filter={filter}
        query={query}
        requests={
          showRequests ? (
            <TransferRequestList requests={list.inbox} resource="skill" />
          ) : undefined
        }
        ownEmpty={<SkillStarterCard />}
        notFoundTitle="Keine Fähigkeit gefunden"
        renderRow={(skill) => (
          <SkillListRow
            skill={skill}
            label={sharedSkillLabel(skill, person)}
            onOpen={() =>
              void navigate({ to: '/skills/$id', params: { id: skill.id } })
            }
          />
        )}
      />
    </div>
  );
}

export function PrototypeSkillsPage({
  initialFilter = 'all',
}: Readonly<{ initialFilter?: ListFilter }>) {
  const { role } = usePrototypeState();
  const person = personForRole(role);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ListFilter>(initialFilter);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const list = useSkillList(person);
  const shownFilter = resolveFilter(filter, list.options);

  return (
    <AppLayout>
      <ContentAreaLayout
        contentHeader={
          <ContentAreaHeader
            breadcrumbs={[{ label: 'Fähigkeiten' }]}
            action={
              <ListToolbar>
                <ListToolbarSearch
                  placeholder="Fähigkeiten durchsuchen"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <ListFilterSelect
                  value={shownFilter}
                  options={list.options}
                  onChange={setFilter}
                />
                <CreateSkillMenu
                  onCreateYourself={() => setIsCreateOpen(true)}
                />
              </ListToolbar>
            }
          />
        }
        contentArea={
          <>
            <SkillsContent
              person={person}
              filter={shownFilter}
              query={query}
              list={list}
            />
            <CreateSkillDialog
              key={isCreateOpen ? `open-${role}` : 'closed'}
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              options={ownerOptionsFor(person, role)}
              onCreated={() => setFilter('all')}
            />
          </>
        }
      />
    </AppLayout>
  );
}
