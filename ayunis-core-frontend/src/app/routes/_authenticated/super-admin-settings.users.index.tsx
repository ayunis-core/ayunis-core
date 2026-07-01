import { createFileRoute } from '@tanstack/react-router';
import SuperAdminUsersPage from '@/pages/super-admin-settings/users';

export const Route = createFileRoute(
  '/_authenticated/super-admin-settings/users/',
)({
  component: SuperAdminUsersPage,
});
