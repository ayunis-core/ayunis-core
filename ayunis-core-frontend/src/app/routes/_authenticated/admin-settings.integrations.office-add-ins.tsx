import { createFileRoute } from '@tanstack/react-router';
import { OfficeAddinsPage } from '@/pages/admin-settings/office-add-ins';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/integrations/office-add-ins',
)({
  component: OfficeAddinsPage,
});
