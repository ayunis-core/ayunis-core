import type { ReactNode } from 'react';
import { Globe } from 'lucide-react';

export default function UrlReferenceInline({
  href,
  children,
}: Readonly<{ href?: string; children?: ReactNode }>) {
  return (
    <a
      href={href}
      title={href}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="url-reference"
      className="not-prose inline-flex max-w-full items-baseline gap-1 rounded bg-muted px-1.5 py-0.5 text-foreground text-sm font-medium align-baseline hover:bg-muted/70"
    >
      <Globe aria-hidden="true" className="size-3 shrink-0 self-center" />
      <span className="truncate">{children}</span>
    </a>
  );
}
