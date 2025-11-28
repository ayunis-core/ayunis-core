import { DatabaseIcon, FileIcon, Sparkles, XIcon } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';
import { cn } from '@/shared/lib/shadcn/utils';
import type {
  SourceResponseDtoCreatedBy,
  SourceResponseDtoType,
} from '@/shared/api';

interface Source {
  id: string;
  name: string;
  type: SourceResponseDtoType;
  createdBy?: SourceResponseDtoCreatedBy;
}

interface SourceBadgeProps {
  source: Source;
  onRemove: (sourceId: string) => void;
  onDownload: (sourceId: string) => void;
}

function getSourceIcon(source: {
  type: SourceResponseDtoType;
  createdBy?: SourceResponseDtoCreatedBy;
}) {
  if (source.createdBy === 'llm') {
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

export function SourceBadge({
  source,
  onRemove,
  onDownload,
}: SourceBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'flex items-center gap-1 cursor-pointer',
        source.createdBy === 'llm' && 'bg-[#8178C3]/10 text-[#8178C3]',
      )}
      onClick={() => source.type === 'data' && onDownload(source.id)}
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
  );
}

