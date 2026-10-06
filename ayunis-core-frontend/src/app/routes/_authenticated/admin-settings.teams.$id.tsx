import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import SettingsLayout from '@/pages/admin-settings/admin-settings-layout/ui/AdminSettingsLayout';
import { TEAMS } from '@/widgets/sharing-prototype/model/fixtures';
import {
  AddTeamMembersButton,
  PrototypeTeamDetail,
} from '@/pages/skill-sharing-prototype';

const searchSchema = z.object({
  page: z.number().min(1).optional().catch(1),
});

export const Route = createFileRoute(
  '/_authenticated/admin-settings/teams/$id',
)({
  validateSearch: searchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { page = 1 } = Route.useSearch();
  const team = TEAMS.find((candidate) => candidate.id === id);
  return (
    <SettingsLayout
      action={<AddTeamMembersButton teamId={id} />}
      breadcrumbs={[
        { label: 'Teams', href: '/admin-settings/teams' },
        { label: team?.name ?? 'Team' },
      ]}
    >
      <PrototypeTeamDetail teamId={id} page={page} />
    </SettingsLayout>
  );
}
