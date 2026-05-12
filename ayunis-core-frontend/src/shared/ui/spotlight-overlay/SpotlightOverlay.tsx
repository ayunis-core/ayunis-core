import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  emitSpotlightRect,
  onSpotlightRequest,
  type SpotlightRequest,
} from '@/shared/lib/spotlight';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from '@/shared/ui/shadcn/card';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  radius: number;
}

const PADDING = 7;
const POLL_INTERVAL = 200;
const MAX_POLL_TIME = 3000;
const PRESENCE_CHECK_INTERVAL = 500;
const RING_STROKE_WIDTH = 4;
const GLOW_OFFSET = 5;

function resolveTargetElement(wrapper: Element): HTMLElement {
  if (wrapper.matches('button, a, [role="button"]'))
    return wrapper as HTMLElement;
  const interactives = wrapper.querySelectorAll<HTMLElement>(
    'button, a, [role="button"]',
  );
  return interactives.length === 1 ? interactives[0] : (wrapper as HTMLElement);
}

function findTargetEl(target: string): HTMLElement | null {
  const wrapper = document.querySelector(`[data-spotlight="${target}"]`);
  return wrapper ? resolveTargetElement(wrapper) : null;
}

function measureTarget(el: HTMLElement): TargetRect {
  const r = el.getBoundingClientRect();
  const innerRadius = Math.min(
    parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
    r.width / 2,
    r.height / 2,
  );
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
    radius: innerRadius + PADDING,
  };
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${x + rr},${y} L${x + w - rr},${y} A${rr},${rr} 0 0 1 ${x + w},${y + rr} L${x + w},${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} L${x + rr},${y + h} A${rr},${rr} 0 0 1 ${x},${y + h - rr} L${x},${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`;
}

const CARD_WIDTH = 320;

function alignLeft(targetRect: TargetRect): number {
  const targetCenter = targetRect.left + targetRect.width / 2;
  const idealLeft =
    targetCenter > window.innerWidth / 2
      ? targetRect.left + targetRect.width - CARD_WIDTH
      : targetRect.left;
  const maxLeft = window.innerWidth - CARD_WIDTH - 16;
  return Math.max(16, Math.min(idealLeft, maxLeft));
}

function Overlay({
  data,
  onClose,
}: Readonly<{ data: SpotlightRequest; onClose: () => void }>) {
  const { t } = useTranslation('getting-started');
  const [rect, setRect] = useState<TargetRect | null>(null);
  const targetElRef = useRef<HTMLElement | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(0);
  const [entered, setEntered] = useState(false);

  useLayoutEffect(() => {
    if (cardRef.current) {
      setCardHeight(cardRef.current.offsetHeight);
    }
  }, [data.title, data.description, rect]);

  // Trigger the fade-in transition one frame after the rect is resolved.
  useEffect(() => {
    if (!rect) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [rect]);

  // Resolve target, then keep it in sync on scroll/resize/DOM changes.
  // Single effect owns both phases; targetElRef is the canonical reference.
  useEffect(() => {
    let pollId: ReturnType<typeof setInterval> | null = null;
    let presenceId: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const refresh = (): boolean => {
      const el = findTargetEl(data.target);
      if (!el) return false;
      targetElRef.current = el;
      setRect(measureTarget(el));
      return true;
    };

    const onUpdate = () => {
      if (cancelled) return;
      if (!refresh()) onClose();
    };

    const start = Date.now();
    const attach = () => {
      window.addEventListener('scroll', onUpdate, true);
      window.addEventListener('resize', onUpdate);
      presenceId = setInterval(onUpdate, PRESENCE_CHECK_INTERVAL);
    };
    // Try once immediately so we don't wait POLL_INTERVAL when the target
    // is already in the DOM (common when navigation has already completed).
    if (refresh()) {
      attach();
    } else {
      pollId = setInterval(() => {
        if (cancelled) return;
        if (refresh()) {
          if (pollId) clearInterval(pollId);
          pollId = null;
          attach();
        } else if (Date.now() - start > MAX_POLL_TIME) {
          if (pollId) clearInterval(pollId);
          pollId = null;
          if (import.meta.env.DEV) {
            console.warn(
              `[Spotlight] target "${data.target}" not found after ${MAX_POLL_TIME}ms — check that a <SpotlightTarget name={...}> wraps it on the current page.`,
            );
          }
          onClose();
        }
      }, POLL_INTERVAL);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
      if (presenceId) clearInterval(presenceId);
      window.removeEventListener('scroll', onUpdate, true);
      window.removeEventListener('resize', onUpdate);
      targetElRef.current = null;
    };
  }, [data.target, onClose]);

  // Broadcast current rect (or null when unset / on unmount)
  useEffect(() => {
    if (!rect) {
      emitSpotlightRect(null);
      return;
    }
    emitSpotlightRect({
      top: rect.top,
      left: rect.left,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
    });
    return () => emitSpotlightRect(null);
  }, [rect]);

  useEffect(() => {
    if (!rect) return;
    const btn = cardRef.current?.querySelector<HTMLElement>('button');
    btn?.focus();
  }, [rect]);

  // Pointerdown on the same resolved element — dismisses the spotlight
  // so the target's native click handler runs afterwards.
  useEffect(() => {
    if (!rect) return;
    const el = targetElRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener('pointerdown', handler);
    return () => el.removeEventListener('pointerdown', handler);
  }, [rect, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && cardRef.current) {
        const buttons = cardRef.current.querySelectorAll<HTMLElement>('button');
        if (buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!rect) return null;

  const hasTooltip = data.title ?? data.description;

  const bottom = rect.top + rect.height;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Inner element rect (button itself, without padding)
  const bx = rect.left + PADDING;
  const by = rect.top + PADDING;
  const bw = rect.width - PADDING * 2;
  const bh = rect.height - PADDING * 2;
  const br = rect.radius - PADDING;

  const dimPath =
    `M0,0 L${vw},0 L${vw},${vh} L0,${vh} Z ` +
    roundedRectPath(rect.left, rect.top, rect.width, rect.height, rect.radius);

  // Solid ring stroke spans the button edge (half inward, half outward) so
  // sub-pixel anti-aliasing can't leave a hairline gap.
  const solidInset = RING_STROKE_WIDTH / 2 - 1;
  const solidPath = roundedRectPath(
    bx - solidInset,
    by - solidInset,
    bw + solidInset * 2,
    bh + solidInset * 2,
    br + solidInset,
  );

  // Glow ring stroke is centered GLOW_OFFSET px outside the button edge.
  const glowPath = roundedRectPath(
    bx - GLOW_OFFSET,
    by - GLOW_OFFSET,
    bw + GLOW_OFFSET * 2,
    bh + GLOW_OFFSET * 2,
    br + GLOW_OFFSET,
  );

  const ringPortal = createPortal(
    // Ring at z-49 so the GettingStartedPill (z-50) renders on top of it.
    // Dim is in a higher portal and still covers the pill (single primary action).
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none z-[49] transition-opacity duration-200 ease-out"
      style={{ opacity: entered ? 1 : 0 }}
      viewBox={`0 0 ${vw} ${vh}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={glowPath}
        fill="none"
        stroke="rgba(129,120,195,0.35)"
        strokeWidth={RING_STROKE_WIDTH}
      />
      <path
        d={solidPath}
        fill="none"
        stroke="#8178C3"
        strokeWidth={RING_STROKE_WIDTH}
      />
    </svg>,
    document.body,
  );

  const dimPortal = createPortal(
    <div
      className="fixed inset-0 z-[9999] pointer-events-none transition-opacity duration-200 ease-out"
      style={{ opacity: entered ? 1 : 0 }}
      role={hasTooltip ? 'dialog' : 'presentation'}
      aria-modal={hasTooltip ? true : undefined}
      aria-label={data.title ?? undefined}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox={`0 0 ${vw} ${vh}`}
        preserveAspectRatio="none"
      >
        <path
          d={dimPath}
          fill="rgba(0,0,0,0.5)"
          fillRule="evenodd"
          style={{ pointerEvents: 'auto', cursor: 'pointer' }}
          onClick={onClose}
        />
      </svg>

      {hasTooltip && (
        <Card
          ref={cardRef}
          className="absolute w-80 py-4 shadow-lg pointer-events-auto"
          style={(() => {
            // Pick below if it fits, otherwise above. Clamp to viewport so
            // the card is always fully visible — never clipped, never
            // scrollable.
            const VIEWPORT_PAD = 24;
            const GAP = 12;
            const spaceBelow = vh - bottom;
            const placeBelow = spaceBelow >= cardHeight + GAP + VIEWPORT_PAD;
            const rawTop = placeBelow
              ? bottom + GAP
              : rect.top - cardHeight - GAP;
            const maxTop = vh - cardHeight - VIEWPORT_PAD;
            const top = Math.max(VIEWPORT_PAD, Math.min(rawTop, maxTop));
            // Hide on the very first render until we've measured (avoids a
            // one-frame flash at the default top: 0).
            return {
              top,
              left: alignLeft(rect),
              visibility: cardHeight === 0 ? 'hidden' : 'visible',
            } as const;
          })()}
        >
          <CardHeader className="gap-1.5 px-4 py-0">
            {data.title && (
              <CardTitle className="text-sm">{data.title}</CardTitle>
            )}
            {data.description && (
              <CardDescription className="leading-relaxed">
                {data.description}
              </CardDescription>
            )}
            <Button
              size="sm"
              className="mt-1 justify-self-start"
              onClick={onClose}
            >
              {t('spotlightDismiss')}
            </Button>
            <CardAction>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={onClose}
              >
                <X className="size-3.5" />
              </Button>
            </CardAction>
          </CardHeader>
        </Card>
      )}
    </div>,
    document.body,
  );

  return (
    <>
      {ringPortal}
      {dimPortal}
    </>
  );
}

export default function SpotlightOverlay() {
  const [active, setActive] = useState<SpotlightRequest | null>(null);

  useEffect(() => onSpotlightRequest((req) => setActive(req)), []);

  if (!active) return null;

  return <Overlay data={active} onClose={() => setActive(null)} />;
}
