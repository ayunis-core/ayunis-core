import { createFileRoute } from '@tanstack/react-router';
import { ChatContextPrototypePage } from '@/pages/chat-context-prototype';
import { parseJourneySearch } from '@/widgets/prototype-journey';

export const Route = createFileRoute('/_authenticated/prototype/chat-context')({
  component: ChatContextPrototypePage,
  validateSearch: parseJourneySearch,
});
