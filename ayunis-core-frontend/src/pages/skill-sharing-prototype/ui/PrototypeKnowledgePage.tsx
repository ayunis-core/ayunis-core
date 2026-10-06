import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { BookOpen, Building2, Search } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';
import { Button } from '@ayunis/ui/components/button';
import { ItemGroup } from '@ayunis/ui/components/item';
import { Tabs, TabsList, TabsTrigger } from '@ayunis/ui/components/tabs';
import AppLayout from '@/layouts/app-layout';
import ContentAreaLayout from '@/layouts/content-area-layout/ui/ContentAreaLayout';
import ContentAreaHeader from '@/widgets/content-area-header/ui/ContentAreaHeader';
import { ListToolbar, ListToolbarSearch } from '@/widgets/list-toolbar';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';
import {
  personForRole,
  reviewableTeamIds,
  skillGroupFor,
} from '@/widgets/sharing-prototype/model/access';
import { useKnowledgeItems } from '@/widgets/sharing-prototype/model/prototype-knowledge';
import { usePrototypeState } from '@/widgets/sharing-prototype/model/prototype-store';
import type {
  Person,
  PrototypeKnowledge,
} from '@/widgets/sharing-prototype/model/types';
import { ownerOptionsFor } from '@/pages/skill-sharing-prototype/lib/owner-options';
import { reviewableRequests } from '@/pages/skill-sharing-prototype/lib/requests';
import {
  isOwnSkill,
  sharedSections,
  sharedSkillLabel,
} from '@/pages/skill-sharing-prototype/lib/skill-meta';
import { CreateKnowledgeItemDialog } from './CreateKnowledgeItemDialog';
import { EmptyHint } from './EmptyHint';
import { ListRow } from './ListRow';
import { RequestCountBadge } from './RequestCountBadge';
import { SkillPanelSection } from './SkillPanelSection';
import { TransferRequestList } from './TransferRequestList';

export type KnowledgeTab = 'own' | 'shared' | 'requests';

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
      description={`${item.description} · ${item.documentCount} Dokumente`}
      onClick={() =>
        void navigate({ to: '/knowledge-bases/$id', params: { id: item.id } })
      }
      actions={
        label && <span className="text-sm text-muted-foreground">{label}</span>
      }
    />
  );
}

function OwnKnowledge({
  items,
  query,
}: Readonly<{ items: PrototypeKnowledge[]; query: string }>) {
  if (items.length === 0) {
    return (
      <EmptyHint
        icon={query ? <Search /> : <BookOpen />}
        title={
          query
            ? 'Keine Wissenssammlung gefunden'
            : 'Noch keine eigenen Wissenssammlungen'
        }
      />
    );
  }
  return (
    <ItemGroup className="gap-2">
      {items.map((item) => (
        <KnowledgeRow key={item.id} item={item} />
      ))}
    </ItemGroup>
  );
}

function SharedKnowledge({
  items,
  person,
  query,
}: Readonly<{ items: PrototypeKnowledge[]; person: Person; query: string }>) {
  const sections = sharedSections(items, person);
  if (sections.length === 0) {
    return (
      <EmptyHint
        icon={query ? <Search /> : <Building2 />}
        title={
          query
            ? 'Keine Wissenssammlung gefunden'
            : 'Noch nichts von Team oder Organisation'
        }
      />
    );
  }
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <SkillPanelSection
          key={section.key}
          title={section.title}
          count={section.skills.length}
        >
          {section.skills.map((item) => (
            <KnowledgeRow
              key={item.id}
              item={item}
              label={sharedSkillLabel(item, person)}
            />
          ))}
        </SkillPanelSection>
      ))}
    </div>
  );
}

function useKnowledgeLists(person: Person, query: string) {
  const items = useKnowledgeItems()
    .filter((item) => matches(item, query))
    .sort((a, b) => a.name.localeCompare(b.name));
  return {
    own: items.filter((item) => isOwnSkill(item, person)),
    shared: items.filter(
      (item) =>
        !isOwnSkill(item, person) && skillGroupFor(item, person) !== null,
    ),
  };
}

function KnowledgeContent({
  tab,
  query,
  onTabChange,
}: Readonly<{
  tab: KnowledgeTab;
  query: string;
  onTabChange: (tab: KnowledgeTab) => void;
}>) {
  const { role, requests } = usePrototypeState();
  const person = personForRole(role);
  const lists = useKnowledgeLists(person, query);
  const teamIds = reviewableTeamIds(person, role, 'knowledge');
  const inbox = reviewableRequests(requests, 'knowledge', person, role);
  const canReview = teamIds.length > 0;
  const shown = tab === 'requests' && !canReview ? 'own' : tab;

  return (
    <div className="space-y-4">
      <Tabs
        value={shown}
        onValueChange={(value) => onTabChange(value as KnowledgeTab)}
      >
        <TabsList>
          <TabsTrigger value="own">
            Eigene Wissenssammlungen
            <Badge variant="secondary">{lists.own.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="shared">
            Team und Organisation
            <Badge variant="secondary">{lists.shared.length}</Badge>
          </TabsTrigger>
          {canReview && (
            <TabsTrigger value="requests">
              Anfragen
              <RequestCountBadge count={inbox.length} />
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>
      {shown === 'own' && <OwnKnowledge items={lists.own} query={query} />}
      {shown === 'shared' && (
        <SharedKnowledge items={lists.shared} person={person} query={query} />
      )}
      {shown === 'requests' && (
        <TransferRequestList
          requests={inbox}
          resource="knowledge"
          isGrouped={teamIds.length > 1}
        />
      )}
    </div>
  );
}

export function PrototypeKnowledgePage({
  initialTab = 'own',
}: Readonly<{ initialTab?: KnowledgeTab }>) {
  const { role } = usePrototypeState();
  const person = personForRole(role);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<KnowledgeTab>(initialTab);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

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
            <KnowledgeContent tab={tab} query={query} onTabChange={setTab} />
            <CreateKnowledgeItemDialog
              key={isCreateOpen ? `open-${role}` : 'closed'}
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              options={ownerOptionsFor(person, role, 'knowledge')}
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
