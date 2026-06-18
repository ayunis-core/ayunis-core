import { useEffect, useState } from 'react';
import {
  Joyride,
  EVENTS,
  type EventData,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride';
import {
  subscribeTour,
  destroyTour,
  type TourRequest,
} from '@/features/onboarding-tour';
import { Button } from '@/shared/ui/shadcn/button';
import { Card, CardDescription, CardTitle } from '@/shared/ui/shadcn/card';

const SPOTLIGHT_BORDER_COLOR = 'var(--brand)';
const SPOTLIGHT_PADDING = 0;
const OVERLAY_COLOR = 'rgba(0, 0, 0, 0.5)';

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
 * Mounts react-joyride and drives it from the tour store. Rendered once in the
 * app layout; the library handles spotlight, scrolling and positioning.
 */
export function OnboardingTour() {
  const [request, setRequest] = useState<TourRequest | null>(null);
  const [spotlightRadius, setSpotlightRadius] = useState(SPOTLIGHT_PADDING);

  useEffect(() => subscribeTour(setRequest), []);

  if (!request) {
    return null;
  }

  const steps: Step[] = [
    {
      target: `[data-tour="${request.target}"]`,
      title: request.title,
      content: request.description,
      data: { dismissLabel: request.dismissLabel } satisfies TourStepData,
      placement: 'auto',
    },
  ];

  return (
    <Joyride
      key={request.target}
      run
      continuous={false}
      tooltipComponent={TourTooltip}
      steps={steps}
      options={{
        overlayColor: OVERLAY_COLOR,
        spotlightPadding: SPOTLIGHT_PADDING,
        spotlightRadius,
        skipBeacon: true,
        targetWaitTimeout: 3000,
        zIndex: 10000,
        closeButtonAction: 'skip',
      }}
      styles={{
        spotlight: {
          stroke: SPOTLIGHT_BORDER_COLOR,
          strokeWidth: 4,
          style: { pointerEvents: 'none' },
        },
        arrow: { display: 'none' },
      }}
      onEvent={(data: EventData) => {
        if (data.type === EVENTS.STEP_BEFORE) {
          setSpotlightRadius(readSpotlightRadius(request.target));
        }
        if (
          data.type === EVENTS.TOUR_END ||
          data.type === EVENTS.ERROR ||
          data.type === EVENTS.TARGET_NOT_FOUND
        ) {
          destroyTour();
        }
      }}
    />
  );
}
