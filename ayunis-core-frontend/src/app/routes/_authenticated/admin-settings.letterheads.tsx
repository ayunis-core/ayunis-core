import { createFileRoute } from '@tanstack/react-router';
import { LetterheadsSettingsPage } from '@/pages/admin-settings/letterheads-settings';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/letterheads',
)({
  component: LetterheadsSettingsPage,
});
