import {
  CalendarDays,
  CalendarClock,
  Coins,
  Keyboard,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@ayunis/ui/lib/cn';
import type {
  NewsCoverIcon,
  NewsCoverTone,
} from '@/features/home-feed/model/sample-news';

const ICONS: Record<NewsCoverIcon, LucideIcon> = {
  routine: CalendarClock,
  keyboard: Keyboard,
  calendar: CalendarDays,
  credits: Coins,
};

const TONES: Record<NewsCoverTone, string> = {
  violet: 'from-violet-200 via-violet-100 to-fuchsia-100 text-violet-700',
  blue: 'from-sky-200 via-sky-100 to-indigo-100 text-sky-700',
  amber: 'from-amber-200 via-orange-100 to-rose-100 text-amber-700',
  green: 'from-emerald-200 via-teal-100 to-lime-100 text-emerald-700',
};

export function NewsCover({
  cover,
  size = 'large',
  className,
}: Readonly<{
  cover: { tone: NewsCoverTone; icon: NewsCoverIcon };
  size?: 'large' | 'small';
  className?: string;
}>) {
  const Icon = ICONS[cover.icon];
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        TONES[cover.tone],
        size === 'large' ? 'rounded-xl' : 'rounded-lg',
        className,
      )}
      aria-hidden
    >
      <div className="absolute -top-1/3 -right-1/4 size-2/3 rounded-full bg-white/40 blur-2xl" />
      <div className="absolute -bottom-1/3 -left-1/4 size-1/2 rounded-full bg-white/30 blur-2xl" />
      <div
        className={cn(
          'relative flex items-center justify-center rounded-2xl bg-white/70 shadow-sm backdrop-blur',
          size === 'large' ? 'size-20' : 'size-8 rounded-lg',
        )}
      >
        <Icon className={size === 'large' ? 'size-9' : 'size-4'} />
      </div>
    </div>
  );
}
