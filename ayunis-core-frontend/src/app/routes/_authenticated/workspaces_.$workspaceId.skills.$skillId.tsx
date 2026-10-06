import { createFileRoute } from '@tanstack/react-router';
import { PrototypeSkillPage } from '@/pages/skill-sharing-prototype';

export const Route = createFileRoute(
  '/_authenticated/workspaces_/$workspaceId/skills/$skillId',
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { skillId } = Route.useParams();
  return <PrototypeSkillPage key={skillId} skillId={skillId} />;
}
