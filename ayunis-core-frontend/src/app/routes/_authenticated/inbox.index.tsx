import { createFileRoute } from '@tanstack/react-router';
import { InboxNoSelection } from '@/pages/inbox';

export const Route = createFileRoute('/_authenticated/inbox/')({
  component: InboxNoSelection,
});
