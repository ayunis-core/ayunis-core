import { useEffect, type CSSProperties, type ReactNode } from 'react';

const HOLD_MS = 4400;

export function ChapterScreen({
  title,
  transitionName,
  onDone,
}: Readonly<{
  title: ReactNode;
  transitionName?: string;
  onDone: () => void;
}>) {
  const titleStyle: CSSProperties | undefined = transitionName
    ? { viewTransitionName: transitionName }
    : undefined;

  useEffect(() => {
    const timeoutId = window.setTimeout(onDone, HOLD_MS);
    return () => window.clearTimeout(timeoutId);
  }, [onDone]);

  return (
    <button type="button" className="wp-flow wp-chapter" onClick={onDone}>
      <div className="wp-flow__question">
        <h2 className="wp-flow__title" style={titleStyle}>
          {title}
        </h2>
      </div>
    </button>
  );
}

export function Highlight({ children }: Readonly<{ children: ReactNode }>) {
  return <span className="wp-shimmer md:block">{children}</span>;
}
