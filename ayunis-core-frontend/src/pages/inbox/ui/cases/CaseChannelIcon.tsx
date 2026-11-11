import { AtSign, FileInput, Mail, ScanLine } from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import type { CaseChannel } from '@/pages/inbox/model/sample-cases';

const ICONS = {
  email: Mail,
  letter: ScanLine,
  ozg: FileInput,
  mention: AtSign,
} as const;

export function CaseChannelIcon({
  channel,
  className,
}: Readonly<{ channel: CaseChannel; className?: string }>) {
  const Icon = ICONS[channel];
  return (
    <Icon
      className={cn(
        'text-muted-foreground',
        channel === 'mention' && 'text-primary',
        className,
      )}
    />
  );
}
