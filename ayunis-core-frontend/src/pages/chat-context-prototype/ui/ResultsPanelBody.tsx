import {
  ChevronRight,
  FileStack,
  FileText,
  GitBranch,
  Table,
} from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@ayunis/ui/components/empty';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import {
  ARTIFACTS,
  type ArtifactType,
} from '@/pages/chat-context-prototype/model/mock';

interface ResultsPanelBodyProps {
  artifactIds: string[];
  onOpen: (artifactId: string) => void;
}

export function ResultsPanelBody({
  artifactIds,
  onOpen,
}: Readonly<ResultsPanelBodyProps>) {
  if (artifactIds.length === 0) {
    return (
      <Empty>
        <EmptyMedia variant="icon">
          <FileStack />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle>Noch keine Ergebnisse</EmptyTitle>
          <EmptyDescription>
            Hier sammelt sich, was Ayunis Core in diesem Chat erstellt.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ItemGroup>
      {artifactIds.map((id) => (
        <Item
          key={id}
          asChild
          size="sm"
          className="group -mx-2 cursor-pointer px-2 py-2 hover:bg-accent"
        >
          <button type="button" onClick={() => onOpen(id)}>
            <ItemMedia className="text-muted-foreground [&_svg]:size-4">
              <ArtifactTypeIcon type={ARTIFACTS[id].type} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{ARTIFACTS[id].name}</ItemTitle>
            </ItemContent>
            <ItemActions>
              <ChevronRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </ItemActions>
          </button>
        </Item>
      ))}
    </ItemGroup>
  );
}

function ArtifactTypeIcon({ type }: Readonly<{ type: ArtifactType }>) {
  if (type === 'spreadsheet') return <Table />;
  if (type === 'diagram') return <GitBranch />;
  return <FileText />;
}
