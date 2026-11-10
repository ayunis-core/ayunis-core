import type { PlinthStatus } from '@/pages/new-chat/model/plinth-sections';

export function PlinthStatusLine({
  status,
  isDetectedOpen = false,
  onDetectedClick,
}: Readonly<{
  status: PlinthStatus;
  isDetectedOpen?: boolean;
  onDetectedClick?: () => void;
}>) {
  return (
    <span
      key={status.kind}
      className="ml-auto shrink-0 pl-2 text-muted-foreground animate-in fade-in-0 duration-500"
    >
      {status.kind === 'running' && (
        <span className="home-plinth__status">
          <span className="home-plinth__running-dot" aria-hidden />
          <span className="home-plinth__shimmer">{status.text}</span>
        </span>
      )}
      {status.kind === 'detected' && (
        <button
          type="button"
          aria-expanded={isDetectedOpen}
          onClick={onDetectedClick}
          className="home-plinth__chip home-plinth__detected"
        >
          <span className="home-plinth__running-dot" aria-hidden />
          {status.label}
        </button>
      )}
    </span>
  );
}
