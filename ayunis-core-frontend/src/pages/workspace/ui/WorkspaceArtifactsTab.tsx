import { useState } from 'react';
import { FileText } from 'lucide-react';
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
  ItemTitle,
} from '@ayunis/ui/components/item';
import { useArtifactsControllerFindByWorkspace } from '@/shared/api/generated/ayunisCoreAPI';
import { CONTEXT_PAGE_SIZE, pageTotal } from './WorkspaceContextList.model';
import {
  WorkspaceContextEmpty,
  WorkspaceContextPagination,
} from './WorkspaceContextList';
import { getWorkspaceArtifactRoute } from '@/pages/workspace/lib/workspace-artifact-route';

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
    <section className="space-y-3">
      {isLoading ? <p>{t('context.addDialog.loading')}</p> : null}
      {!isLoading && artifacts.length === 0 ? (
        <WorkspaceContextEmpty
          icon={<FileText />}
          title={t('artifacts.emptyTitle')}
          description={t('artifacts.empty')}
          testId="workspace-artifacts-empty"
        />
      ) : null}
      {artifacts.length > 0 ? (
        <ItemGroup className="gap-2">
          {artifacts.map((artifact) => {
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
    </section>
  );
}

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(updatedAt));
}
