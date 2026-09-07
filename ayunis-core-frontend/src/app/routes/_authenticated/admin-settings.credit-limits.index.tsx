import { createFileRoute } from '@tanstack/react-router';
import CreditLimitsSettingsPage from '@/pages/admin-settings/credit-limits-settings';
import { creditLimitSearchSchema } from '@/features/credit-limits/model/credit-limit-settings';

export const Route = createFileRoute(
  '/_authenticated/admin-settings/credit-limits/',
)({
  validateSearch: creditLimitSearchSchema,
  component: RouteComponent,
});

function RouteComponent() {
  return <CreditLimitsSettingsPage filters={Route.useSearch()} />;
}
