import { Lock } from 'lucide-react';
import { Badge } from '@ayunis/ui/components/badge';

export function ReadOnlyBadge({
  label = 'Nur lesen',
}: Readonly<{ label?: string }>) {
  return (
    <Badge variant="secondary">
      <Lock />
      {label}
    </Badge>
  );
}
