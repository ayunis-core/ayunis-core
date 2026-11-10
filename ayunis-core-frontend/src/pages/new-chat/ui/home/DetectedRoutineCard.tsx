import { Link } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import type { Detection } from '@/features/home-feed';

export function DetectionCard({
  detection,
  onDismiss,
  children,
}: Readonly<{
  detection: Detection;
  onDismiss: () => void;
  children?: React.ReactNode;
}>) {
  return (
    <div className="home-plinth__row flex flex-col gap-4 px-3 pt-2 pb-3 text-sm">
      <div className="flex items-start gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="font-medium">{detection.proposal}</p>
          <p className="text-xs text-muted-foreground">{detection.pattern}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onDismiss}
          >
            Nicht jetzt
          </Button>
          <Button size="sm" asChild>
            <Link to={detection.to}>{detection.action}</Link>
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
