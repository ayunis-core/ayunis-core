import { createFileRoute } from '@tanstack/react-router';
import { ChatContextPrototypePage } from '@/pages/chat-context-prototype';

export const Route = createFileRoute('/_authenticated/prototype/chat-context')({
  component: ChatContextPrototypePage,
});
