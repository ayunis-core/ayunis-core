import { useState } from 'react';
import {
  Download,
  MessageSquare,
  MoreVertical,
  Share2,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';
import { Button } from '@/shared/ui/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { cn } from '@/shared/lib/shadcn/utils';
import {
  GENERATED_CONTENT_GROUP,
  GENERATED_CONTENT_LABELS,
  GENERATED_CONTENT_ORDER,
  type GeneratedContentKind,
  type ProjectDocument,
} from '@/entities/project';
import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { downloadDocument } from '../lib/downloadDocument';

const DOWNLOADABLE_KINDS: GeneratedContentKind[] = ['document', 'diagram'];

interface GeneratedContentRowsProps {
  documents: ProjectDocument[];
  compact?: boolean;
  onOpen?: (doc: ProjectDocument) => void;
  onOpenChat?: (chatId: string, artifactId: string) => void;
  onToggleShared?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function GeneratedContentRows({
  documents,
  compact = false,
  onOpen,
  onOpenChat,
  onToggleShared,
  onRemove,
}: Readonly<GeneratedContentRowsProps>) {
  const [preview, setPreview] = useState<ProjectDocument | null>(null);

  const groups = GENERATED_CONTENT_ORDER.map((group) => ({
    group,
    items: documents.filter(
      (doc) => GENERATED_CONTENT_GROUP[doc.kind ?? 'document'] === group,
    ),
  })).filter((entry) => entry.items.length > 0);

  const rowGap = compact ? 'gap-0' : 'gap-3';

  return (
    <>
      <div className={cn('flex flex-col', compact ? rowGap : 'gap-6')}>
        {groups.map((group) => (
          <div
            key={group.group}
            className={cn('flex flex-col', compact ? rowGap : 'gap-1')}
          >
            {!compact && (
              <span className="text-sm font-medium text-muted-foreground">
                {GENERATED_CONTENT_LABELS[group.group]}
              </span>
            )}
            <ItemGroup className={rowGap}>
              {group.items.map((doc) => (
                <ContentRow
                  key={doc.id}
                  doc={doc}
                  compact={compact}
                  onOpen={() => (onOpen ? onOpen(doc) : setPreview(doc))}
                  onOpenChat={onOpenChat}
                  onToggleShared={onToggleShared}
                  onRemove={onRemove}
                />
              ))}
            </ItemGroup>
          </div>
        ))}
      </div>

      <DocumentPreviewDialog
        document={preview}
        onClose={() => setPreview(null)}
      />
    </>
  );
}

interface ContentRowProps {
  doc: ProjectDocument;
  compact: boolean;
  onOpen: () => void;
  onOpenChat?: (chatId: string, artifactId: string) => void;
  onToggleShared?: (id: string) => void;
  onRemove?: (id: string) => void;
}

function ContentRow({
  doc,
  compact,
  onOpen,
  onOpenChat,
  onToggleShared,
  onRemove,
}: Readonly<ContentRowProps>) {
  const { confirm } = useConfirmation();
  const isDownloadable = DOWNLOADABLE_KINDS.includes(doc.kind ?? 'document');
  const chatId = doc.chatId;

  function handleRemove() {
    confirm({
      title: 'Inhalt löschen',
      description: `Möchten Sie „${doc.name}“ wirklich löschen?`,
      confirmText: 'Löschen',
      variant: 'destructive',
      onConfirm: () => onRemove?.(doc.id),
    });
  }

  return (
    <Item
      variant={compact ? 'default' : 'outline'}
      size="sm"
      className={cn('cursor-pointer', compact && 'px-0 py-1.5')}
      onClick={onOpen}
    >
      <ItemContent>
        <ItemTitle>
          <span className="truncate">{doc.name}</span>
        </ItemTitle>
      </ItemContent>
      <ItemActions
        onClick={(event: React.MouseEvent) => event.stopPropagation()}
      >
        {doc.shared && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <Share2 className="size-3 shrink-0" />
                Geteilt
              </Badge>
            </TooltipTrigger>
            <TooltipContent>Mit dem Projekt geteilt</TooltipContent>
          </Tooltip>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? 'icon-sm' : 'icon'}
              className="text-muted-foreground"
              aria-label={`Aktionen für ${doc.name}`}
            >
              <MoreVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onOpenChat && chatId && (
              <DropdownMenuItem onClick={() => onOpenChat(chatId, doc.id)}>
                <MessageSquare />
                Zum Chat
              </DropdownMenuItem>
            )}
            {isDownloadable && (
              <DropdownMenuItem onClick={() => downloadDocument(doc)}>
                <Download />
                Herunterladen
              </DropdownMenuItem>
            )}
            {onToggleShared && (
              <DropdownMenuItem onClick={() => onToggleShared(doc.id)}>
                <Share2 />
                {doc.shared
                  ? 'Nicht mehr mit dem Projekt teilen'
                  : 'Mit dem Projekt teilen'}
              </DropdownMenuItem>
            )}
            {onRemove && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handleRemove}>
                  <Trash2 />
                  Löschen
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </ItemActions>
    </Item>
  );
}
