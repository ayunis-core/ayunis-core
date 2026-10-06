import { useState } from 'react';
import { Badge } from '@ayunis/ui/components/badge';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ListToolbar, ListToolbarSearch } from '@/widgets/list-toolbar';
import {
  personForRole,
  reviewableTeamIds,
  skillGroupFor,
} from '@/widgets/sharing-prototype/model/access';
import {
  useHasPermission,
  usePrototypeSkills,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeSkill,
} from '@/widgets/sharing-prototype/model/types';
import { ownerOptionsFor } from '@/pages/skill-sharing-prototype/lib/owner-options';
import { reviewableRequests } from '@/pages/skill-sharing-prototype/lib/requests';
import { isOwnSkill } from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { CreateSkillDialog } from './CreateSkillDialog';
import { CreateSkillMenu } from './CreateSkillMenu';
import { RequestCountBadge } from './RequestCountBadge';
import { OwnSkills, SharedSkills } from './SkillLists';
import { MarketplacePromoBanner } from './MarketplacePromoBanner';
import { TransferRequestList } from './TransferRequestList';

export type SkillsTab = 'own' | 'shared' | 'requests';

function matches(skill: PrototypeSkill, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return `${skill.name} ${skill.shortDescription}`
    .toLowerCase()
    .includes(needle);
}

function useSkillLists(person: Person, query: string) {
  const skills = usePrototypeSkills();
  const found = skills
    .filter((skill) => matches(skill, query))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    own: found.filter((skill) => isOwnSkill(skill, person)),
    shared: found.filter(
      (skill) =>
        !isOwnSkill(skill, person) && skillGroupFor(skill, person) !== null,
    ),
  };
}

function SkillsTabList({
  counts,
  canReview,
}: Readonly<{
  counts: Record<SkillsTab, number>;
  canReview: boolean;
}>) {
  return (
    <TabsList>
      <TabsTrigger value="own">
        Eigene Fähigkeiten
        <Badge variant="secondary">{counts.own}</Badge>
      </TabsTrigger>
      <TabsTrigger value="shared">
        Team und Organisation
        <Badge variant="secondary">{counts.shared}</Badge>
      </TabsTrigger>
      {canReview && (
        <TabsTrigger value="requests">
          Anfragen
          <RequestCountBadge count={counts.requests} />
        </TabsTrigger>
      )}
    </TabsList>
  );
}

function SkillsContent({
  tab,
  initialTab,
  query,
  onTabChange,
}: Readonly<{
  tab: SkillsTab;
  initialTab: SkillsTab;
  query: string;
  onTabChange: (tab: SkillsTab) => void;
}>) {
  const { role, requests } = usePrototypeState();
  const person = personForRole(role);
  const lists = useSkillLists(person, query);
  const teamIds = reviewableTeamIds(person, role, 'skill');
  const inbox = reviewableRequests(requests, 'skill', person, role);
  const canReview = teamIds.length > 0;
  const mayUseMarketplace = useHasPermission(
    role,
    'install_marketplace_skills',
  );
  const shown = tab === 'requests' && !canReview ? initialTab : tab;

  return (
    <div className="space-y-4">
      <Tabs
        value={shown}
        onValueChange={(value) => onTabChange(value as SkillsTab)}
      >
        <SkillsTabList
          counts={{
            own: lists.own.length,
            shared: lists.shared.length,
            requests: inbox.length,
          }}
          canReview={canReview}
        />
      </Tabs>
      {mayUseMarketplace && shown !== 'requests' && !query && (
        <MarketplacePromoBanner />
      )}
      {shown === 'own' && <OwnSkills skills={lists.own} query={query} />}
      {shown === 'shared' && (
        <SharedSkills skills={lists.shared} person={person} query={query} />
      )}
      {shown === 'requests' && (
        <TransferRequestList
          requests={inbox}
          resource="skill"
          isGrouped={teamIds.length > 1}
        />
      )}
    </div>
  );
}

export function PrototypeSkillsPage({
  initialTab = 'own',
}: Readonly<{ initialTab?: SkillsTab }>) {
  const { role } = usePrototypeState();
  const person = personForRole(role);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<SkillsTab>(initialTab);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
              tab={tab}
              initialTab={initialTab === 'requests' ? 'own' : initialTab}
              query={query}
              onTabChange={setTab}
            />
            <CreateSkillDialog
              key={isCreateOpen ? `open-${role}` : 'closed'}
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              options={ownerOptionsFor(person, role)}
              onCreated={(owner) => {
                if (owner.kind !== 'user') setTab('shared');
              }}
            />
          </>
        }
      />
    </AppLayout>
  );
}
