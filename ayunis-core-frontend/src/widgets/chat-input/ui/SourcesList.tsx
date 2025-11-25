// Types
import type {
  SourceResponseDtoType,
  SourceResponseDtoCreatedBy,
} from '@/shared/api';

// Utils
import { cn } from '@/shared/lib/shadcn/utils';

// UI
import { Badge } from '@/shared/ui/shadcn/badge';

// Icons
import { XIcon, FileIcon, DatabaseIcon, Sparkles } from 'lucide-react';

interface Source {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  createdBy?: SourceResponseDtoCreatedBy;
}

interface SourcesListProps {
  sources: Source[];
  onRemove: (sourceId: string) => void;
  onDownload?: (sourceId: string) => void;
}

function getSourceIcon(source: {
  type: SourceResponseDtoType;
  createdByLLM?: boolean;
}) {
  if (source.createdByLLM) {
    return <Sparkles className="h-3 w-3" />;
  }
  switch (source.type) {
    case 'text':
      return <FileIcon className="h-3 w-3" />;
    case 'data':
      return <DatabaseIcon className="h-3 w-3" />;
    default:
      return null;
  }
}

export function SourcesList({
  sources,
  onRemove,
  onDownload,
}: SourcesListProps) {
  const visibleSources = sources.filter(
    (source) => source.createdBy !== 'system',
  );

  if (visibleSources.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {visibleSources.map((source) => (
        <Badge
          key={source.id}
          variant="secondary"
          className={cn(
            'flex items-center gap-1 cursor-pointer',
            source.createdBy === 'llm' && 'bg-[#8178C3]/10 text-[#8178C3]',
          )}
          onClick={() => source.type === 'data' && onDownload?.(source.id)}
        >
          {getSourceIcon(source)}
          {source.name}
          <div
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(source.id);
            }}
          >
            <XIcon className="h-3 w-3" />
          </div>
        </Badge>
      ))}
    </div>
  );
}
