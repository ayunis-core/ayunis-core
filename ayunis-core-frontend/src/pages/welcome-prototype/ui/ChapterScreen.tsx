import { useEffect, type ReactNode } from 'react';

const HOLD_MS = 4400;

export function ChapterScreen({
  title,
  onDone,
}: Readonly<{
  title: ReactNode;
  onDone: () => void;
}>) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDone, HOLD_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onDone]);

  return (
    <button type="button" className="wp-flow wp-chapter" onClick={onDone}>
      <div className="wp-flow__question">
        <h2 className="wp-flow__title">{title}</h2>
      </div>
    </button>
  );
}

export function Highlight({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="wp-shimmer md:block">{children}</span>;
}
