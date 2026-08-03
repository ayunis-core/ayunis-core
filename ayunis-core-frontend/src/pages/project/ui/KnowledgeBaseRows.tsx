import { ChevronRight, X } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/shadcn/collapsible';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import {
  KNOWLEDGE_BASE_FILES,
  type ProjectKnowledgeBase,
} from '@/entities/project';

interface KnowledgeBaseRowsProps {
  knowledgeBases: ProjectKnowledgeBase[];
  compact?: boolean;
  onRemove?: (id: string) => void;
}

export function KnowledgeBaseRows({
  knowledgeBases,
  compact = false,
  onRemove,
}: Readonly<KnowledgeBaseRowsProps>) {
  return (
    <ItemGroup className={compact ? 'gap-0' : 'gap-3'}>
      {knowledgeBases.map((kb) => {
        const files = KNOWLEDGE_BASE_FILES[kb.name] ?? [];
        return (
          <Collapsible key={kb.id} asChild>
            <Item
              variant={compact ? 'default' : 'outline'}
              size="sm"
              className={compact ? 'px-0 py-1.5' : undefined}
            >
              <ItemContent>
                <CollapsibleTrigger className="group flex w-fit items-center gap-1.5 text-left">
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                  <ItemTitle>{kb.name}</ItemTitle>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <ul className="mt-2 flex flex-col gap-1 border-l pl-3 text-xs text-muted-foreground">
                    {files.map((file) => (
                      <li key={file} className="truncate">
                        {file}
                      </li>
                    ))}
                  </ul>
                </CollapsibleContent>
              </ItemContent>
              {onRemove && (
                <ItemActions>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(kb.id)}
                    aria-label={`${kb.name} aus dem Projekt entfernen`}
                  >
                    <X />
                  </Button>
                </ItemActions>
              )}
            </Item>
          </Collapsible>
        );
      })}
    </ItemGroup>
  );
}
