import { useState } from 'react';
import { useNavigate, useRouter } from '@tanstack/react-router';
import { ExternalLink, HelpCircle, MessageSquarePlus } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  AdventCalendarLinkButtonDtoKind,
  AdventCalendarPromptButtonDtoKind,
  AdventCalendarQuizButtonDtoKind,
  type AdventCalendarDoorContentResponseDto,
  type AdventCalendarLinkButtonDto,
  type AdventCalendarPromptButtonDto,
  type AdventCalendarQuizButtonDto,
} from '@ayunis/api-client/schemas';
import { AdventCalendarQuiz } from './AdventCalendarQuiz';

const IN_APP_PATH = /^\/(?!\/)/;
const WEB_URL = /^https?:\/\//i;

type DoorButton = AdventCalendarDoorContentResponseDto['buttons'][number];

interface AdventCalendarDoorActionsProps {
  buttons: DoorButton[];
}

export function AdventCalendarDoorActions({
  buttons,
}: Readonly<AdventCalendarDoorActionsProps>) {
  const [quizOpen, setQuizOpen] = useState(false);
  const quiz = buttons.find(
    (button): button is AdventCalendarQuizButtonDto =>
      button.kind === AdventCalendarQuizButtonDtoKind.quiz,
  );
  if (buttons.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {buttons.map((button, index) => {
          const testId = `advent-calendar-button-${index}`;
          if (button.kind === AdventCalendarLinkButtonDtoKind.link) {
            return <LinkButton key={testId} button={button} testId={testId} />;
          }
          if (button.kind === AdventCalendarPromptButtonDtoKind.prompt) {
            return (
              <PromptButton key={testId} button={button} testId={testId} />
            );
          }
          return (
            <Button
              key={testId}
              variant="outline"
              aria-expanded={quizOpen}
              onClick={() => setQuizOpen((open) => !open)}
              data-testid={testId}
              data-kind={button.kind}
            >
              <HelpCircle />
              {button.label}
            </Button>
          );
        })}
      </div>
      {quiz && quizOpen && <AdventCalendarQuiz quiz={quiz} />}
    </div>
  );
}

function LinkButton({
  button,
  testId,
}: Readonly<{ button: AdventCalendarLinkButtonDto; testId: string }>) {
  const router = useRouter();
  if (IN_APP_PATH.test(button.url)) {
    return (
      <Button
        onClick={() => router.history.push(button.url)}
        data-testid={testId}
        data-kind={button.kind}
      >
        {button.label}
      </Button>
    );
  }
  if (!WEB_URL.test(button.url)) return null;
  return (
    <Button asChild>
      <a
        href={button.url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid={testId}
        data-kind={button.kind}
      >
        {button.label}
        <ExternalLink />
      </a>
    </Button>
  );
}

function PromptButton({
  button,
  testId,
}: Readonly<{ button: AdventCalendarPromptButtonDto; testId: string }>) {
  const navigate = useNavigate();
  return (
    <Button
      onClick={() =>
        void navigate({ to: '/chat', search: { prompt: button.prompt } })
      }
      data-testid={testId}
      data-kind={button.kind}
    >
      <MessageSquarePlus />
      {button.label}
    </Button>
  );
}
