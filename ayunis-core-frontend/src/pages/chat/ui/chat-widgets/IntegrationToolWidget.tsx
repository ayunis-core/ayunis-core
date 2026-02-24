import { useState } from 'react';
import { ChevronsUpDown, Loader2, Plug } from 'lucide-react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { formatToolName } from '../../lib/format-tool-name';
import {
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from '@/shared/ui/shadcn/item';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/shadcn/collapsible';
import { useAutoScroll } from '@/features/useAutoScroll';

export default function IntegrationToolWidget({
  content,
  isStreaming = false,
}: Readonly<{
  content: ToolUseMessageContent;
  isStreaming?: boolean;
}>) {
  const [open, setOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- content.params may be undefined during streaming
  const hasParams = content.params && Object.keys(content.params).length > 0;
  const isLoadingParams = isStreaming && !hasParams;

  const integration = content.integration;
  const toolHint = formatToolName(content.name);
  const input = isLoadingParams ? '' : JSON.stringify(content.params, null, 2);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-2">
      <div className="rounded-md border">
        <div className="flex items-center gap-2.5 px-4 py-3">
          <ItemMedia variant="image">
            <IntegrationIcon
              logoUrl={integration?.logoUrl ?? null}
              name={integration?.name ?? ''}
              isLoading={isStreaming || isLoadingParams}
            />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{integration?.name ?? 'Integration'}</ItemTitle>
            <ItemDescription>{toolHint}</ItemDescription>
          </ItemContent>
          <ItemActions>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronsUpDown className="h-4 w-4" />
              </button>
            </CollapsibleTrigger>
          </ItemActions>
        </div>
        <CollapsibleContent>
          <ToolDetails input={input} />
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ToolDetails({ input }: Readonly<{ input: string }>) {
  const { scrollRef, handleScroll } = useAutoScroll(input);
  return (
    <div
      className="max-h-32 overflow-y-auto border-t px-4 py-2 text-muted-foreground whitespace-pre-wrap text-xs"
      ref={scrollRef}
      onScroll={handleScroll}
    >
      {input}
    </div>
  );
}

function IntegrationIcon({
  logoUrl,
  name,
  isLoading,
}: Readonly<{ logoUrl: string | null; name: string; isLoading: boolean }>) {
  if (isLoading) {
    return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />;
  }
  if (logoUrl) {
    return (
      <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
    );
  }
  return <Plug className="h-5 w-5 text-muted-foreground" />;
}
