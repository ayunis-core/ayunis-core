import { createFileRoute } from '@tanstack/react-router';
import { PrototypeModelPage } from '@/pages/skill-sharing-prototype';

export const Route = createFileRoute(
  '/_authenticated/skills/so-funktioniert-es',
)({
  component: PrototypeModelPage,
});
