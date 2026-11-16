import { createFileRoute } from '@tanstack/react-router';
import {
  SuggestionPrototypePage,
  parseScenarioKey,
} from '@/pages/suggestion-prototype';

export const Route = createFileRoute('/_authenticated/prototype/suggestions')({
  validateSearch: (search: Record<string, unknown>) => ({
    kind: parseScenarioKey(search.kind),
  }),
  component: SuggestionPrototypeRoute,
});

function SuggestionPrototypeRoute() {
  const { kind } = Route.useSearch();
  return <SuggestionPrototypePage kind={kind} />;
}
