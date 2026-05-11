import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
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

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;
const BORDER_RADIUS = 12;
const POLL_INTERVAL = 200;
const MAX_POLL_TIME = 5000;
const TOOLTIP_MAX_WIDTH = 340;
const PRESENCE_CHECK_INTERVAL = 500;

function getTargetRect(target: string): Rect | null {
  const el = document.querySelector(`[data-spotlight="${target}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function isInsideRect(x: number, y: number, r: Rect): boolean {
  return (
    x >= r.left && x <= r.left + r.width && y >= r.top && y <= r.top + r.height
  );
}

function clampLeft(idealLeft: number): number {
  const maxLeft = window.innerWidth - TOOLTIP_MAX_WIDTH - 16;
  return Math.max(16, Math.min(idealLeft, maxLeft));
}

function Overlay({
  data,
  onClose,
}: Readonly<{ data: SpotlightRequest; onClose: () => void }>) {
  const { t } = useTranslation('getting-started');
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const r = getTargetRect(data.target);
      if (r) {
        setRect(r);
        clearInterval(id);
      } else if (Date.now() - start > MAX_POLL_TIME) {
        clearInterval(id);
        onClose();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [data.target, onClose]);

  useEffect(() => {
    if (!rect) return;

    const sync = () => {
      const r = getTargetRect(data.target);
      if (!r) {
        onClose();
        return;
      }
      setRect(r);
    };

    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    const checkId = setInterval(sync, PRESENCE_CHECK_INTERVAL);

    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
      clearInterval(checkId);
    };
    // Only set up once when rect becomes non-null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!rect, data.target, onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (rect && isInsideRect(e.clientX, e.clientY, rect)) {
        onClose();
        const el = document.querySelector(`[data-spotlight="${data.target}"]`);
        if (el instanceof HTMLElement) el.click();
        return;
      }
      onClose();
    },
    [rect, data.target, onClose],
  );

  if (!rect) return null;

  const clipPath = `polygon(
    0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
    ${rect.left}px ${rect.top}px,
    ${rect.left}px ${rect.top + rect.height}px,
    ${rect.left + rect.width}px ${rect.top + rect.height}px,
    ${rect.left + rect.width}px ${rect.top}px,
    ${rect.left}px ${rect.top}px
  )`;

  const hasTooltip = data.title ?? data.description;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999]"
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-black/50 transition-[clip-path] duration-300 ease-out"
        style={{ clipPath }}
      />

      <div
        className="absolute pointer-events-none"
        style={{
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          borderRadius: BORDER_RADIUS,
          boxShadow: '0 0 0 4px rgba(255,255,255,0.8)',
        }}
      />

      {hasTooltip && (
        <Card
          className="absolute w-80 py-4 shadow-lg"
          style={{
            top: rect.top + rect.height + 12,
            left: clampLeft(rect.left),
          }}
          onClick={(e) => e.stopPropagation()}
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
}

export default function SpotlightOverlay() {
  const [active, setActive] = useState<SpotlightRequest | null>(null);

  useEffect(() => onSpotlightRequest((req) => setActive(req)), []);

  if (!active) return null;

  return <Overlay data={active} onClose={() => setActive(null)} />;
}
