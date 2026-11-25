import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import { ArrowUp, Mic, Plus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { ChatComposer } from '@ayunis/chat/composer';
import { Markdown } from '@ayunis/chat/markdown';
import { AssistantMessageFrame } from '@ayunis/chat/messages';
import '@ayunis/chat/composer.css';
import { ProcessingGlow } from '@/shared/ui/processing-glow';
import { AyunisProgressOrb } from '@/widgets/ayunis-progress-orb';
import { ModelModeIcon } from '@/widgets/model-select-options';
import type { ChatMessage } from '@/pages/welcome-prototype/model/chat-script';
import { useChatScript } from '@/pages/welcome-prototype/model/use-chat-script';
import { useStreamedText } from '@/pages/welcome-prototype/model/use-streamed-text';
import { MemoryCard } from './MemoryCard';
import './chat-flow.css';

const HERO_TRANSITION: CSSProperties = { viewTransitionName: 'wp-chat-hero' };

function AssistantMessage({
  message,
  isCurrent,
  onConfirm,
}: Readonly<{
  message: ChatMessage;
  isCurrent: boolean;
  onConfirm: () => void;
}>) {
  const text = [message.lead, message.text, message.note]
    .filter(Boolean)
    .join('\n\n');
  const { shown, isDone } = useStreamedText(text, !message.isHero);

  return (
    <div style={message.isHero ? HERO_TRANSITION : undefined}>
      <AssistantMessageFrame grouped>
        <Markdown isStreaming={!isDone}>{shown}</Markdown>
        {message.facts && isDone && (
          <div className="wp-msg__widget">
            <MemoryCard
              facts={message.facts}
              active={isCurrent}
              onConfirm={onConfirm}
            />
          </div>
        )}
      </AssistantMessageFrame>
    </div>
  );
}

function UserMessageView({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex flex-col items-end">
      <div className="bg-muted max-w-2xl min-w-0 overflow-hidden rounded-2xl px-4 py-2.5">
        {text}
      </div>
    </div>
  );
}

export function ChatFlow({
  heroText,
  onComplete,
}: Readonly<{ heroText: string; onComplete: () => void }>) {
  const chat = useChatScript(heroText);
  const [draft, setDraft] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const question =
    chat.currentStep?.kind === 'question'
      ? chat.currentStep.question
      : undefined;
  const lastMessageId = chat.messages.at(-1)?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.messages.length, chat.typing]);

  function send(values: string[]) {
    const text = values.filter(Boolean).join(', ');
    if (!text || !question) return;
    setDraft('');
    setPicked([]);
    chat.answer(text);
  }

  function handleChip(option: string) {
    if (!question?.multiple) {
      send([option]);
      return;
    }
    setPicked((current) =>
      current.includes(option)
        ? current.filter((value) => value !== option)
        : [...current, option],
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    send([...picked, draft.trim()]);
  }

  if (chat.phase === 'hero') {
    return (
      <section className="wp-flow">
        <h2 className="wp-flow__title" style={HERO_TRANSITION}>
          {heroText}
        </h2>
      </section>
    );
  }

  const canSend =
    Boolean(question) && (draft.trim().length > 0 || picked.length > 0);

  return (
    <section className="wp-chatv">
      <div className="wp-chatv__thread">
        <div className="wp-chatv__inner">
          {chat.messages.map((message) =>
            message.role === 'user' ? (
              <UserMessageView key={message.id} text={message.text} />
            ) : (
              <AssistantMessage
                key={message.id}
                message={message}
                isCurrent={message.id === lastMessageId}
                onConfirm={onComplete}
              />
            ),
          )}
          {chat.typing && (
            <div className="wp-msg">
              <AyunisProgressOrb isActive />
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>
      <div className="wp-chatv__composer">
        {question && (
          <div key={question.id} className="wp-chatv__chips">
            {question.options.map((option) => (
              <Button
                key={option}
                type="button"
                variant={picked.includes(option) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleChip(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        )}
        <ProcessingGlow isActive={chat.typing} className="chat-input-shell">
          <ChatComposer
            state={chat.typing ? 'streaming' : 'idle'}
            dragging={false}
            animateHeight
            images={[]}
            onRemoveImage={() => undefined}
            textarea={{
              value: draft,
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: handleKeyDown,
              placeholder: question
                ? 'Antworten oder oben auswählen'
                : 'Nachricht an Ayunis Core',
              'aria-label': 'Nachricht an Ayunis Core',
            }}
            actions={
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" aria-label="Hinzufügen">
                  <Plus />
                </Button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm">
                    <ModelModeIcon mode="auto" />
                    Auto
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Diktieren"
                  >
                    <Mic />
                  </Button>
                  <Button
                    size="icon"
                    className="chat-input-send-button rounded-full"
                    disabled={!canSend}
                    aria-label="Senden"
                    onClick={() => send([...picked, draft.trim()])}
                  >
                    <ArrowUp />
                  </Button>
                </div>
              </div>
            }
          />
        </ProcessingGlow>
      </div>
    </section>
  );
}
