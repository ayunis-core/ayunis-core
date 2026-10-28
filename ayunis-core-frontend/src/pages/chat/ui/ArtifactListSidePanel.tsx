import { AlertTriangle, FileText, GitBranch, Table2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTitle } from '@ayunis/ui/components/alert';
import { Button } from '@ayunis/ui/components/button';
import { Empty, EmptyHeader, EmptyTitle } from '@ayunis/ui/components/empty';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { ScrollArea } from '@ayunis/ui/components/scroll-area';
import { Skeleton } from '@ayunis/ui/components/skeleton';
import { useThreadArtifacts } from '@/pages/chat/api/useThreadArtifacts';
import type {
  ArtifactResponseDto,
  ArtifactResponseDtoType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

const artifactIcons: Record<ArtifactResponseDtoType, LucideIcon> = {
  document: FileText,
  spreadsheet: Table2,
  diagram: GitBranch,
};

interface ArtifactListSidePanelProps {
  readonly threadId: string;
  readonly onSelect: (artifactId: string) => void;
}

export function ArtifactListSidePanel({
  threadId,
  onSelect,
}: Readonly<ArtifactListSidePanelProps>) {
  const { artifacts, isLoading, error, refetch } = useThreadArtifacts(threadId);

  return (
    <ArtifactListContent
      artifacts={artifacts}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      onSelect={onSelect}
    />
  );
}

interface ArtifactListContentProps {
  readonly artifacts: ArtifactResponseDto[];
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly onRetry: () => void;
  readonly onSelect: (artifactId: string) => void;
}

function ArtifactListContent({
  artifacts,
  isLoading,
  error,
  onRetry,
  onSelect,
}: Readonly<ArtifactListContentProps>) {
  const { t } = useTranslation('chat');
  if (isLoading) return <ArtifactListSkeleton />;
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="warning">
          <AlertTriangle />
          <AlertTitle>{t('chat.artifactPanel.listLoadError')}</AlertTitle>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            {t('chat.artifactPanel.retry')}
          </Button>
        </Alert>
      </div>
    );
  }
  if (artifacts.length === 0) {
    return (
      <Empty className="flex-1">
        <EmptyHeader>
          <EmptyTitle>{t('chat.artifactPanel.emptyTitle')}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }
  return (
    <ScrollArea className="min-h-0 flex-1">
      <ItemGroup className="gap-2 p-4">
        {artifacts.map((artifact) => (
          <ArtifactListItem
            key={artifact.id}
            artifact={artifact}
            onSelect={onSelect}
          />
        ))}
      </ItemGroup>
    </ScrollArea>
  );
}

function ArtifactListItem({
  artifact,
  onSelect,
}: Readonly<{
  artifact: ArtifactResponseDto;
  onSelect: (artifactId: string) => void;
}>) {
  const { t } = useTranslation('chat');
  const Icon = artifactIcons[artifact.type];
  return (
    <Item
      asChild
      variant="outline"
      size="sm"
      className="cursor-pointer hover:bg-accent/50"
    >
      <button
        type="button"
        data-testid={`artifact-list-item-${artifact.id}`}
        onClick={() => onSelect(artifact.id)}
      >
        <ItemMedia variant="icon">
          <Icon data-testid={`artifact-type-icon-${artifact.type}`} />
        </ItemMedia>
        <ItemContent className="min-w-0 text-left">
          <ItemTitle className="max-w-full truncate">
            {artifact.title}
          </ItemTitle>
          <ItemDescription>
            {t(`chat.artifactPanel.type.${artifact.type}`)}
          </ItemDescription>
        </ItemContent>
      </button>
    </Item>
  );
}

function ArtifactListSkeleton() {
  return (
    <div className="space-y-2 p-4" data-testid="artifact-list-loading">
      {[0, 1, 2].map((row) => (
        <Skeleton key={row} className="h-16 w-full" />
      ))}
    </div>
  );
}
