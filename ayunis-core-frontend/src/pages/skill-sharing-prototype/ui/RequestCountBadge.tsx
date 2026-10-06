import { Badge } from '@ayunis/ui/components/badge';

export function RequestCountBadge({ count }: Readonly<{ count: number }>) {
  if (count === 0) return <Badge variant="secondary">0</Badge>;
  return (
    <Badge
      aria-label={`${count} offene Anfragen`}
      className="border-transparent bg-brand text-brand-foreground"
    >
      {count}
    </Badge>
  );
}
