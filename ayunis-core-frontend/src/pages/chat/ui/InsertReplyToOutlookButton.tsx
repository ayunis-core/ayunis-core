import { Mail } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@ayunis/ui/components/tooltip';
import { useEmbedded } from '@/shared/contexts/embedded/useEmbedded';
import {
  useOutlookReply,
  useOutlookCompose,
} from '@/features/outlook/useOutlookMail';

interface InsertReplyToOutlookButtonProps {
  readonly contentRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Pushes the assistant's drafted reply into Outlook's native reply form
 * (recipients, subject and quoting handled by Outlook, nothing sent). Only
 * rendered inside the Outlook task pane.
 */
export default function InsertReplyToOutlookButton({
  contentRef,
}: InsertReplyToOutlookButtonProps) {
  const isEmbedded = useEmbedded();
  const { draftReply } = useOutlookReply();
  const { isCompose } = useOutlookCompose();

  // In a reply window the answer is written into the draft automatically —
  // opening a second reply here would just spawn another window, so hide it.
  if (!isEmbedded || isCompose) return null;

  const handleInsert = () => {
    const el = contentRef.current;
    if (!el) return;
    const parts = el.querySelectorAll('[data-copyable="true"]');
    const html = Array.from(parts)
      .map((part) => part.innerHTML)
      .join('<br><br>');
    if (html.trim()) draftReply(html);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="mt-1 h-7 w-7"
          onClick={handleInsert}
          aria-label="In Outlook-Antwort übernehmen"
        >
          <Mail className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>In Outlook-Antwort übernehmen</TooltipContent>
    </Tooltip>
  );
}
