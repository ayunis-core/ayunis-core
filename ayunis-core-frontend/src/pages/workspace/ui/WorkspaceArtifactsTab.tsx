import {
  FileText,
  GitBranch,
  Mail,
  Table2,
  type LucideIcon,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@ayunis/ui/components/alert';
import { Badge } from '@ayunis/ui/components/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type {
  ArtifactResponseDto,
  ArtifactResponseDtoType,
} from '@/shared/api';
import { getWorkspaceArtifactRoute } from '../lib/workspace-artifact-route';

interface WorkspaceArtifactsTabProps {
  readonly artifacts: ArtifactResponseDto[] | null;
}

const artifactIcons: Record<ArtifactResponseDtoType, LucideIcon> = {
  document: FileText,
  diagram: GitBranch,
  spreadsheet: Table2,
  email: Mail,
};

export function WorkspaceArtifactsTab({
  artifacts,
}: Readonly<WorkspaceArtifactsTabProps>) {
  const { t } = useTranslation('workspace');

  if (artifacts === null) {
    return (
      <Alert variant="warning">
        <AlertTitle>{t('artifacts.loadError.title')}</AlertTitle>
        <AlertDescription>
          {t('artifacts.loadError.description')}
        </AlertDescription>
      </Alert>
    );
  }

  if (artifacts.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>{t('artifacts.emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('artifacts.empty')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">{t('artifacts.title')}</h3>
        <p className="text-sm text-muted-foreground">
          {t('artifacts.description')}
        </p>
      </div>
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
    </section>
  );
}

function formatUpdatedAt(updatedAt: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(updatedAt));
}
