import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CircleCheck, CircleX, RotateCcw } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Item } from '@ayunis/ui/components/item';
import { cn } from '@ayunis/ui/lib/cn';
import type { AdventCalendarQuizButtonDto } from '@ayunis/api-client/schemas';

interface AdventCalendarQuizProps {
  quiz: AdventCalendarQuizButtonDto;
}

export function AdventCalendarQuiz({
  quiz,
}: Readonly<AdventCalendarQuizProps>) {
  const { t } = useTranslation('advent-calendar');
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === quiz.correctAnswerIndex;

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border p-4"
      data-testid="advent-calendar-quiz"
    >
      <p className="font-medium">{quiz.question}</p>
      <div className="flex flex-col gap-2">
        {quiz.answers.map((answer, index) => (
          <Item key={index} asChild variant="outline" size="sm">
            <button
              type="button"
              className="enabled:cursor-pointer enabled:hover:bg-accent/50"
              disabled={answered}
              onClick={() => setPicked(index)}
              data-testid={`advent-calendar-quiz-answer-${index}`}
            >
              <span className="flex-1 text-left">{answer}</span>
              {index === picked && <ResultIcon correct={correct} />}
            </button>
          </Item>
        ))}
      </div>
      {answered && (
        <div
          role="status"
          className="flex flex-col gap-2"
          data-testid="advent-calendar-quiz-result"
          data-correct={correct}
        >
          <p
            className={cn(
              'flex items-center gap-2 font-medium',
              correct ? 'text-brand' : 'text-destructive',
            )}
          >
            <ResultIcon correct={correct} />
            {correct ? t('quiz.correct') : t('quiz.incorrect')}
          </p>
          {quiz.explanation && (
            <p
              className="text-sm text-muted-foreground"
              data-testid="advent-calendar-quiz-explanation"
            >
              {quiz.explanation}
            </p>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setPicked(null)}
            data-testid="advent-calendar-quiz-retry"
          >
            <RotateCcw />
            {t('quiz.tryAgain')}
          </Button>
        </div>
      )}
    </section>
  );
}

function ResultIcon({ correct }: Readonly<{ correct: boolean }>) {
  return correct ? (
    <CircleCheck className="size-4 shrink-0 text-brand" aria-hidden />
  ) : (
    <CircleX className="size-4 shrink-0 text-destructive" aria-hidden />
  );
}
