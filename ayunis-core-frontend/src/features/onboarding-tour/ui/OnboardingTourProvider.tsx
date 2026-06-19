import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  useJoyride,
  EVENTS,
  type EventData,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride';
import { Button } from '@/shared/ui/shadcn/button';
import { Card, CardDescription, CardTitle } from '@/shared/ui/shadcn/card';
import {
  OnboardingTourContext,
  type TourRequest,
} from '../model/onboardingTourContext';

const SPOTLIGHT_BORDER_COLOR = 'var(--brand)';
const SPOTLIGHT_PADDING = 0;

// react-joyride's spotlightRadius is a fixed number with no "inherit" option, so
// we read the target's own border-radius to keep the cutout concentric with it.
function readSpotlightRadius(target: string): number {
  const el = document.querySelector(`[data-tour="${target}"]`);

  if (!el) {
    return SPOTLIGHT_PADDING;
  }

  return (
    (Number.parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0) +
    SPOTLIGHT_PADDING
  );
}

// Shape of the `data` we attach to each step (typed as `any` by react-joyride).
type TourStepData = { dismissLabel?: string };

function TourTooltip({
  step,
  tooltipProps,
  closeProps,
}: Readonly<TooltipRenderProps>) {
  const dismissLabel =
    (step.data as TourStepData | undefined)?.dismissLabel ?? '';

  return (
    <Card {...tooltipProps} className="w-80 gap-3 p-4">
      {step.title && <CardTitle>{step.title}</CardTitle>}
      {step.content && <CardDescription>{step.content}</CardDescription>}
      <Button size="sm" className="self-start" {...closeProps}>
        {dismissLabel}
      </Button>
    </Card>
  );
}

/**
 * Drives react-joyride via its hook for a single active request. Mounted only
 * while a tour is active (so `useJoyride` always has real steps), and re-keyed
 * per target so switching spotlights re-initialises cleanly.
 */
function TourRenderer({
  request,
  onEnd,
}: Readonly<{ request: TourRequest; onEnd: () => void }>) {
  const [spotlightRadius, setSpotlightRadius] = useState(SPOTLIGHT_PADDING);

  const steps: Step[] = [
    {
      target: `[data-tour="${request.target}"]`,
      title: request.title,
      content: request.description,
      data: { dismissLabel: request.dismissLabel } satisfies TourStepData,
      placement: 'auto',
    },
  ];

  const { Tour } = useJoyride({
    run: true,
    continuous: false,
    tooltipComponent: TourTooltip,
    steps,
    options: {
      spotlightPadding: SPOTLIGHT_PADDING,
      spotlightRadius,
      skipBeacon: true,
      targetWaitTimeout: 3000,
      zIndex: 10000,
      closeButtonAction: 'skip',
    },
    styles: {
      spotlight: {
        stroke: SPOTLIGHT_BORDER_COLOR,
        strokeWidth: 4,
        style: { pointerEvents: 'none' },
      },
      arrow: { display: 'none' },
    },
    onEvent: (data: EventData) => {
      if (data.type === EVENTS.STEP_BEFORE) {
        setSpotlightRadius(readSpotlightRadius(request.target));
      }
      if (
        data.type === EVENTS.TOUR_END ||
        data.type === EVENTS.ERROR ||
        data.type === EVENTS.TARGET_NOT_FOUND
      ) {
        onEnd();
      }
    },
  });

  return Tour;
}

/**
 * Holds the current tour request and renders the spotlight via react-joyride.
 * `children` is passed through untouched, so launching a tour re-renders only
 * this provider and its context consumers — not the page tree.
 */
export function OnboardingTourProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [request, setRequest] = useState<TourRequest | null>(null);

  const launchTour = useCallback((next: TourRequest) => setRequest(next), []);
  const endTour = useCallback(() => setRequest(null), []);

  const isTourActive = request !== null;
  const value = useMemo(
    () => ({ launchTour, isTourActive }),
    [launchTour, isTourActive],
  );

  return (
    <OnboardingTourContext.Provider value={value}>
      {children}
      {request && (
        <TourRenderer key={request.target} request={request} onEnd={endTour} />
      )}
    </OnboardingTourContext.Provider>
  );
}
