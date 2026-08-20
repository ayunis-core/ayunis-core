import { useState } from 'react';
import { FileText, GitBranch, Table2, type LucideIcon } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useArtifactsControllerFindByWorkspace } from '@/shared/api/generated/ayunisCoreAPI';
import type { ArtifactResponseDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import {
  WorkspaceContextEmpty,
  WorkspaceContextPagination,
  WorkspaceContextSection,
} from './WorkspaceContextList';
import { getWorkspaceArtifactRoute } from '@/pages/workspace/lib/workspace-artifact-route';

const artifactIcons: Record<ArtifactResponseDtoType, LucideIcon> = {
  document: FileText,
  diagram: GitBranch,
  spreadsheet: Table2,
};

export function WorkspaceArtifactsTab({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const { t } = useTranslation('workspace');
  const [page, setPage] = useState(1);
  const params = {
    limit: CONTEXT_PAGE_SIZE,
    offset: (page - 1) * CONTEXT_PAGE_SIZE,
  };
  const { data, isLoading, error } = useArtifactsControllerFindByWorkspace(
    workspaceId,
    params,
  );
  const artifacts = data?.data ?? [];

  if (error) {
    return (
      <Alert variant="warning">
        <AlertTitle>{t('artifacts.loadError.title')}</AlertTitle>
        <AlertDescription>
          {t('artifacts.loadError.description')}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <WorkspaceContextSection
      title={t('artifacts.title')}
      description={t('artifacts.description')}
    >
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && artifacts.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<FileText />}
          title={t('artifacts.emptyTitle')}
          description={t('artifacts.empty')}
        />
      ) : null}
      {artifacts.length > 0 ? (
        <ItemGroup className="gap-2">
          {artifacts.map((artifact) => {
            const Icon = artifactIcons[artifact.type];
            const route = getWorkspaceArtifactRoute(artifact);
            return (
              <Item
                asChild
                key={artifact.id}
                variant="outline"
                className="cursor-pointer"
                data-testid={`workspace-artifact-${artifact.id}`}
              >
                <Link
                  to="/chats/$threadId"
                  params={{ threadId: route.threadId }}
                  search={{ artifactId: route.artifactId }}
                >
                  <ItemMedia variant="icon">
                    <Icon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {artifact.title || t('artifacts.untitled')}
                    </ItemTitle>
                    <ItemDescription>
                      {t(`artifacts.type.${artifact.type}`)} ·{' '}
                      {t('artifacts.version', {
                        version: artifact.currentVersionNumber,
                      })}{' '}
                      · {formatUpdatedAt(artifact.updatedAt)}
                    </ItemDescription>
                  </ItemContent>
                  <Badge variant="secondary">{t('artifacts.open')}</Badge>
                </Link>
              </Item>
            );
          })}
        </ItemGroup>
      ) : null}
      <WorkspaceContextPagination
        page={page}
        total={pageTotal(data?.pagination)}
        testId="workspace-artifacts-pagination"
        onPageChange={setPage}
      />
    </WorkspaceContextSection>
  );
}

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(updatedAt));
}
