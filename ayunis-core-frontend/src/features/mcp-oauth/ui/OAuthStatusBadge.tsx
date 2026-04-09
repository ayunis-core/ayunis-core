import { CheckCircle2, Clock3 } from 'lucide-react';
import { Badge } from '@/shared/ui/shadcn/badge';

interface OAuthStatusBadgeProps {
  status: 'authorized' | 'pending';
  authorizedLabel: string;
  pendingLabel: string;
}

export function OAuthStatusBadge({
  status,
  authorizedLabel,
  pendingLabel,
}: Readonly<OAuthStatusBadgeProps>) {
  const isAuthorized = status === 'authorized';

  return (
    <Badge variant={isAuthorized ? 'secondary' : 'outline'}>
      {isAuthorized ? <CheckCircle2 /> : <Clock3 />}
      {isAuthorized ? authorizedLabel : pendingLabel}
    </Badge>
  );
}
