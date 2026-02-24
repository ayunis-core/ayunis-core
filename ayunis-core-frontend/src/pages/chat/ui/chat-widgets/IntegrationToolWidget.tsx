import { useState } from 'react';
import { Loader2, Plug } from 'lucide-react';
import type { ToolUseMessageContent } from '../../model/openapi';
import { formatToolName } from '../../lib/format-tool-name';
import AgentActivityHint from '@/widgets/agent-activity-hint/ui/AgentActivityHint';

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

  const icon =
    isStreaming || isLoadingParams ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <IntegrationIcon
        logoUrl={integration?.logoUrl ?? null}
        name={integration?.name ?? ''}
      />
    );

  const hint = (
    <span className="flex items-center gap-1.5">
      {integration?.name && (
        <span className="font-medium">{integration.name}</span>
      )}
      <span className="text-muted-foreground">{toolHint}</span>
    </span>
  );

  return (
    <AgentActivityHint
      open={open}
      onOpenChange={setOpen}
      icon={icon}
      hint={hint}
      input={isLoadingParams ? '' : JSON.stringify(content.params, null, 2)}
    />
  );
}

function IntegrationIcon({
  logoUrl,
  name,
}: Readonly<{ logoUrl: string | null; name: string }>) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="h-4 w-4 rounded-sm object-cover"
      />
    );
  }
  return <Plug className="h-4 w-4" />;
}
