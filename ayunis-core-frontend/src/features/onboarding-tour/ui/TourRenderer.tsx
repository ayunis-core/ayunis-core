import type { TourRequest } from '../model/onboardingTourContext';
import { useState } from 'react';
import {
  useJoyride,
  EVENTS,
  type EventData,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride';
import { Button } from '@/shared/ui/shadcn/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/shadcn/card';

const SPOTLIGHT_BORDER_COLOR = 'var(--brand)';
const SPOTLIGHT_PADDING = 0;

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

type TourStepData = { dismissLabel?: string };

function TourTooltip({
  step,
  tooltipProps,
  closeProps,
}: Readonly<TooltipRenderProps>) {
  const dismissLabel =
    (step.data as TourStepData | undefined)?.dismissLabel ?? '';

  return (
    <Card {...tooltipProps} className="w-80 py-4">
      <CardHeader className='px-4'>
        {step.title && <CardTitle>{step.title}</CardTitle>}
        {step.content && <CardDescription>{step.content}</CardDescription>}
      </CardHeader>
      <CardContent className='px-4'>
        <Button size="sm" className="self-start" {...closeProps}>
          {dismissLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function TourRenderer({
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
