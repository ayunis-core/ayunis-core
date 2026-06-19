import type { TourRequest } from '../model/onboardingTourContext';
import { useEffect, useState } from 'react';
import {
  useJoyride,
  EVENTS,
  type EventData,
  type Step,
  type TooltipRenderProps,
} from 'react-joyride';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';

const SPOTLIGHT_BORDER_COLOR = 'var(--brand)';
const SPOTLIGHT_STROKE_WIDTH = 4;
const SPOTLIGHT_PADDING = 2;

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

function TourTooltip({
  step,
  tooltipProps,
  closeProps,
}: Readonly<TooltipRenderProps>) {
  if (!step.title && !step.content) {
    return null;
  }

  return (
    <Card {...tooltipProps} className="w-80 py-4">
      <CardHeader className="px-4">
        {step.title && <CardTitle>{step.title}</CardTitle>}
        {step.content && <CardDescription>{step.content}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4">
        <Button size="sm" className="self-start" {...closeProps}>
          {step.locale.close}
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

  // Dismiss the tour when the user clicks the highlighted target. react-joyride
  // has no built-in prop for this (overlayClickAction only covers the dark
  // overlay area), so we detect it ourselves. We test the pointer coordinates
  // against the target's rect rather than event.target, because the overlay SVG
  // sits on top — the click's event.target can be that SVG path, not the
  // element underneath. pointerdown in the capture phase fires regardless.
  useEffect(() => {
    const selector = `[data-tour="${request.target}"]`;
    const handlePointerDown = (event: PointerEvent) => {
      const targetEl = document.querySelector(selector);
      if (!targetEl) {
        return;
      }
      const rect = targetEl.getBoundingClientRect();
      const inside =
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom;
      if (inside) {
        onEnd();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [request.target, onEnd]);

  const steps: Step[] = [
    {
      target: `[data-tour="${request.target}"]`,
      title: request.title,
      content: request.description,
      locale: { close: request.dismissLabel },
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
        strokeWidth: SPOTLIGHT_STROKE_WIDTH,
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
