import { Bell } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useNews } from '@/features/home-feed';
import { Link } from '@tanstack/react-router';

export function NewsBellButton() {
  const news = useNews();
  const unread = news.filter((entry) => entry.isUnread).length;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-8"
          aria-label={
            unread > 0 ? `Neuigkeiten, ${unread} ungelesen` : 'Neuigkeiten'
          }
          asChild
        >
          <Link to="/news">
            <Bell />
            {unread > 0 && (
              <span
                className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand ring-2 ring-sidebar"
                aria-hidden
              />
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {unread > 0 ? `Neuigkeiten · ${unread} ungelesen` : 'Neuigkeiten'}
      </TooltipContent>
    </Tooltip>
  );
}
