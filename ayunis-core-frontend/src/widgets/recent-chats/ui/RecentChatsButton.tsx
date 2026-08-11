import { History, Loader2, MessageCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@ayunis/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useThreads } from '@/widgets/app-sidebar/api';

export default function RecentChatsButton() {
  const navigate = useNavigate();
  const { threads, isLoading } = useThreads();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Letzte Chats">
              <History className="h-5 w-5 text-primary" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Letzte Chats</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Letzte Chats</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {isLoading && (
          <DropdownMenuItem disabled>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Wird geladen …</span>
          </DropdownMenuItem>
        )}
        {!isLoading && threads.length === 0 && (
          <DropdownMenuItem disabled>Noch keine Chats</DropdownMenuItem>
        )}
        {threads.map((thread) => (
          <DropdownMenuItem
            key={thread.id}
            onClick={() =>
              void navigate({
                to: '/chats/$threadId',
                params: { threadId: thread.id },
              })
            }
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {thread.title ?? 'Unbenannter Chat'}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
