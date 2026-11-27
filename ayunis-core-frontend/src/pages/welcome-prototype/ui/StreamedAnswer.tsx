import { Markdown } from '@ayunis/chat/markdown';
import { AssistantMessageFrame } from '@ayunis/chat/messages';
import { useStreamedText } from '@/pages/welcome-prototype/model/use-streamed-text';

export function StreamedAnswer({ text }: Readonly<{ text: string }>) {
  const { shown, isDone } = useStreamedText(text, true);
  return (
    <AssistantMessageFrame grouped>
      <Markdown isStreaming={!isDone}>{shown}</Markdown>
    </AssistantMessageFrame>
  );
}
