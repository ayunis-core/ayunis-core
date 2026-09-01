import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  JOURNEY,
  type AvailabilityVariant,
  type EntryVariant,
} from '@/widgets/prototype-journey/model/journey';

export const PROTOTYPE_PATH = '/prototype/chat-context';

export interface JourneySearch {
  step: number;
  entry: EntryVariant;
  avail: AvailabilityVariant;
}

const ENTRY_VARIANTS: EntryVariant[] = ['single', 'menu', 'header'];
const AVAILABILITY_VARIANTS: AvailabilityVariant[] = [
  'row',
  'split',
  'dropdowns',
  'underInput',
];

export function parseJourneySearch(
  search: Record<string, unknown>,
): JourneySearch {
  const step = Number(search.step);
  const entry = String(search.entry) as EntryVariant;
  const avail = String(search.avail) as AvailabilityVariant;
  return {
    step:
      Number.isInteger(step) && step >= 0 && step < JOURNEY.length ? step : 0,
    entry: ENTRY_VARIANTS.includes(entry) ? entry : 'single',
    avail: AVAILABILITY_VARIANTS.includes(avail) ? avail : 'row',
  };
}

export function useJourneySearch(): JourneySearch {
  const search = useRouterState({ select: (state) => state.location.search });
  return parseJourneySearch(search);
}

export function useJourneyNavigate(): (patch: Partial<JourneySearch>) => void {
  const navigate = useNavigate();
  const current = useJourneySearch();
  return (patch) => {
    void navigate({ to: PROTOTYPE_PATH, search: { ...current, ...patch } });
  };
}
