import { useEffect, useRef, useState } from 'react';
import { Markdown } from '@/widgets/markdown';
import CreateSkillWidget from '@/pages/chat/ui/chat-widgets/CreateSkillWidget';
import {
  OTHER_REPLY,
  type Scenario,
  type SkillDraft,
  type Suggestion,
} from '@/pages/suggestion-prototype/model/scenarios';
import type { SuggestionStatus } from '@/pages/suggestion-prototype/ui/ResultCard';
import { SuggestionCard } from '@/pages/suggestion-prototype/ui/SuggestionCard';
import { KIND_APPEARANCE } from '@/pages/suggestion-prototype/ui/kind-appearance';
import { MultiConfirmCard } from '@/pages/suggestion-prototype/ui/MultiConfirmCard';

const SIMULATED_ACTION_MS = 900;
const ALWAYS_ALLOWED_NOTE = 'Ab jetzt ohne Nachfrage';

interface PrototypeTranscriptProps {
  scenario: Scenario;
  replies: string[];
}

export function PrototypeTranscript({
  scenario,
  replies,
}: Readonly<PrototypeTranscriptProps>) {
  return (
    <div className="flex flex-col gap-6 p-4 pb-8">
      <UserBubble text={scenario.userMessage} />
      <div className="flex flex-col gap-2">
        <Markdown>{scenario.assistantMessage}</Markdown>
        {scenario.multiConfirmation && (
          <MultiConfirmCard {...scenario.multiConfirmation} />
        )}
        {scenario.suggestion && (
          <InteractiveSuggestion
            suggestion={scenario.suggestion}
            skillDraft={scenario.skillDraft}
          />
        )}
      </div>
      {replies.map((reply, index) => (
        <div key={`${index}-${reply}`} className="flex flex-col gap-6">
          <UserBubble text={reply} />
          <Markdown>{OTHER_REPLY}</Markdown>
        </div>
      ))}
    </div>
  );
}

function InteractiveSuggestion({
  suggestion,
  skillDraft,
}: Readonly<{ suggestion: Suggestion; skillDraft?: SkillDraft }>) {
  const [status, setStatus] = useState<SuggestionStatus>('open');
  const [customizing, setCustomizing] = useState(false);
  const [resultNote, setResultNote] = useState<string>();
  const pendingTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(pendingTimer.current), []);

  if (customizing && skillDraft) {
    return <SkillForm draft={skillDraft} />;
  }

  function handleAccept() {
    setStatus('pending');
    pendingTimer.current = window.setTimeout(
      () => setStatus('accepted'),
      SIMULATED_ACTION_MS,
    );
  }

  const alwaysAllowFirst =
    KIND_APPEARANCE[suggestion.kind].alwaysAllowFirst === true;

  function handlePrimary() {
    if (alwaysAllowFirst) {
      setResultNote(ALWAYS_ALLOWED_NOTE);
    }
    handleAccept();
  }

  function handleSecondary() {
    if (skillDraft) {
      setCustomizing(true);
      return;
    }
    handleAccept();
  }

  return (
    <SuggestionCard
      suggestion={suggestion}
      status={status}
      onAccept={handlePrimary}
      onSecondary={handleSecondary}
      onDismiss={() => setStatus('dismissed')}
      onUndoDismiss={() => setStatus('open')}
      resultNote={resultNote}
    />
  );
}

function SkillForm({ draft }: Readonly<{ draft: SkillDraft }>) {
  return (
    <CreateSkillWidget
      content={{
        type: 'tool_use',
        id: 'prototype-create-skill',
        name: 'create_skill',
        params: { ...draft, is_active: true },
      }}
    />
  );
}

function UserBubble({ text }: Readonly<{ text: string }>) {
  return (
    <div className="flex justify-end">
      <div className="max-w-2xl min-w-0 rounded-2xl bg-muted py-2.5 px-4">
        <Markdown className="[&_p]:!my-0">{text}</Markdown>
      </div>
    </div>
  );
}
