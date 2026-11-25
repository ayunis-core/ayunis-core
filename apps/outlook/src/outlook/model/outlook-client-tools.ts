import {
  createClientToolRegistry,
  type ClientToolRegistration,
} from '@ayunis/chat/surface';
import {
  executeOutlookTool,
  isOutlookDraftTool,
  OUTLOOK_TOOL,
  type OutlookToolDependencies,
  type OutlookToolName,
  type OutlookToolOutcome,
} from '@/features/outlook-tools';
import { OutlookDraftCard } from '@/outlook/ui/OutlookDraftWidget';

function registerOutlookTool(
  name: OutlookToolName,
): ClientToolRegistration<OutlookToolDependencies, OutlookToolOutcome> {
  return {
    execute: ({ params }, dependencies) =>
      executeOutlookTool(name, params, dependencies),
    render: isOutlookDraftTool(name) ? OutlookDraftCard : undefined,
  };
}

export const outlookClientTools = createClientToolRegistry<
  OutlookToolDependencies,
  OutlookToolOutcome
>(
  Object.fromEntries(
    Object.values(OUTLOOK_TOOL).map((name) => [
      name,
      registerOutlookTool(name),
    ]),
  ),
);
