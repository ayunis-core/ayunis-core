import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/shared/lib/shadcn/utils';

const FADE_MASK = 'linear-gradient(to top, transparent 0, black 1.25rem)';

interface ScrollFadeContainerProps {
  children: ReactNode;
  className?: string;
}

export function ScrollFadeContainer({
  children,
  className,
}: Readonly<ScrollFadeContainerProps>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showFade, setShowFade] = useState(false);

  const updateFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollHeight > el.clientHeight + 1;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    setShowFade(hasOverflow && !atBottom);
  }, []);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(updateFade);
    observer.observe(content);
    return () => observer.disconnect();
  }, [updateFade]);

  return (
    <div
      ref={scrollRef}
      onScroll={updateFade}
      className="max-h-[4.5rem] overflow-y-auto"
      style={
        showFade
          ? { maskImage: FADE_MASK, WebkitMaskImage: FADE_MASK }
          : undefined
      }
    >
      <div
        ref={contentRef}
        className={cn('flex flex-wrap items-center gap-2', className)}
      >
        {children}
      </div>
    </div>
  );
}
