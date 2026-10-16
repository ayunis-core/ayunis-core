import { useTranslation } from 'react-i18next';
import { BookOpen, Building2, Search } from 'lucide-react';
import { ItemGroup } from '@ayunis/ui/components/item';
import { OwnerSectionList } from '@/features/resource-ownership';
import type { KnowledgeBase } from '@/pages/knowledge-bases/model/openapi';
import { EmptyHint } from '@/shared/ui/empty-hint/EmptyHint';
import { KnowledgeBaseRow } from './KnowledgeBaseRow';

export function OwnKnowledgeBaseList({
  knowledgeBases,
  isSearching,
  canCreateOwn,
}: Readonly<{
  knowledgeBases: KnowledgeBase[];
  isSearching: boolean;
  canCreateOwn: boolean;
}>) {
  const { t } = useTranslation('knowledge-bases');
  if (knowledgeBases.length === 0) {
    return isSearching ? (
      <EmptyHint icon={<Search />} title={t('emptyState.search')} />
    ) : (
      <EmptyHint
        icon={<BookOpen />}
        title={t('emptyState.personal.title')}
        description={
          canCreateOwn
            ? t('emptyState.personal.description')
            : t('emptyState.noAccessDescription')
        }
        testId="knowledge-bases-own-empty"
      />
    );
  }
  return (
    <ItemGroup className="gap-2">
      {knowledgeBases.map((knowledgeBase) => (
        <KnowledgeBaseRow
          key={knowledgeBase.id}
          knowledgeBase={knowledgeBase}
        />
      ))}
    </ItemGroup>
  );
}

export function SharedKnowledgeBaseList({
  knowledgeBases,
  isSearching,
}: Readonly<{ knowledgeBases: KnowledgeBase[]; isSearching: boolean }>) {
  const { t } = useTranslation('knowledge-bases');
  return (
    <OwnerSectionList
      items={knowledgeBases}
      testIdPrefix="knowledge-bases"
      renderItem={(knowledgeBase) => (
        <KnowledgeBaseRow
          key={knowledgeBase.id}
          knowledgeBase={knowledgeBase}
          showSubmittedBy
        />
      )}
      empty={
        isSearching ? (
          <EmptyHint icon={<Search />} title={t('emptyState.search')} />
        ) : (
          <EmptyHint
            icon={<Building2 />}
            title={t('emptyState.shared.title')}
            description={t('emptyState.shared.description')}
            testId="knowledge-bases-shared-empty"
          />
        )
      }
    />
  );
}
