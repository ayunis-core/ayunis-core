import { Lock } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';

export function ReadOnlyBadge({
  label = 'Nur lesen',
}: Readonly<{ label?: string }>) {
  return (
    <Badge variant="outline" className="gap-1 [&_svg]:size-3">
      <Lock />
      {label}
    </Badge>
  );
}
