import { useNavigate, useRouterState } from '@tanstack/react-router';
import {
  JOURNEY,
  type AvailabilityVariant,
  type ContextLayout,
  type PanelFrame,
} from '@/widgets/prototype-journey/model/journey';

export const PROTOTYPE_PATH = '/prototype/chat-context';

export interface JourneySearch {
  step: number;
  avail: AvailabilityVariant;
  layout: ContextLayout;
  frame: PanelFrame;
}

const AVAILABILITY_VARIANTS: AvailabilityVariant[] = [
  'row',
  'split',
  'dropdowns',
  'underInput',
];
const CONTEXT_LAYOUTS: ContextLayout[] = ['tree', 'flat', 'split'];
const PANEL_FRAMES: PanelFrame[] = ['fill', 'stroke', 'divider'];

export function parseJourneySearch(
  search: Record<string, unknown>,
): JourneySearch {
  const step = Number(search.step);
  const avail = String(search.avail) as AvailabilityVariant;
  const layout = String(search.layout) as ContextLayout;
  const frame = String(search.frame) as PanelFrame;
  return {
    step:
      Number.isInteger(step) && step >= 0 && step < JOURNEY.length ? step : 0,
    avail: AVAILABILITY_VARIANTS.includes(avail) ? avail : 'row',
    layout: CONTEXT_LAYOUTS.includes(layout) ? layout : 'tree',
    frame: PANEL_FRAMES.includes(frame) ? frame : 'fill',
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
