import { useCallback } from 'react';
import type { MarkdownProps } from '@ayunis/chat/markdown';
import { Markdown } from '@/widgets/markdown';
import { useTrackProductiveOutcome } from '@/shared/lib/openpanel-outcomes';

export default function TimelineMarkdown(props: Readonly<MarkdownProps>) {
  const trackOutcome = useTrackProductiveOutcome();
  const onCodeCopied = useCallback(
    () => trackOutcome({ outcome_type: 'code_copied', output_type: 'code' }),
    [trackOutcome],
  );
  return <Markdown {...props} onCodeCopied={onCodeCopied} />;
}
