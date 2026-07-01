import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import type {
  QuizQuestionForTakingResponseDto,
  SubmitQuizRequestDto,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import QuizQuestionCard from './QuizQuestionCard';

interface QuizFormProps {
  questions: QuizQuestionForTakingResponseDto[];
  isSubmitting: boolean;
  onSubmit: (data: SubmitQuizRequestDto) => void;
}

export default function QuizForm({
  questions,
  isSubmitting,
  onSubmit,
}: Readonly<QuizFormProps>) {
  const { t } = useTranslation('academy');
  const [answers, setAnswers] = useState<Record<string, number>>({});

  // A retry re-draws questions; clear any prior selections when the set changes.
  const questionsKey = questions.map((q) => q.id).join(',');
  const [prevQuestionsKey, setPrevQuestionsKey] = useState(questionsKey);
  if (questionsKey !== prevQuestionsKey) {
    setPrevQuestionsKey(questionsKey);
    setAnswers({});
  }

  const allAnswered = questions.every((q) => Object.hasOwn(answers, q.id));

  const handleSubmit = () => {
    onSubmit({
      answers: questions.map((q) => ({
        questionId: q.id,
        selectedOptionIndex: answers[q.id],
      })),
    });
  };

  return (
    <div className="mx-auto max-w-[800px] space-y-4">
      {questions.map((question, index) => (
        <QuizQuestionCard
          key={question.id}
          question={question}
          index={index}
          total={questions.length}
          selectedIndex={answers[question.id]}
          disabled={isSubmitting}
          onSelect={(optionIndex) =>
            setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
          }
        />
      ))}
      <div className="flex items-center justify-end gap-3">
        {!allAnswered && (
          <span className="text-sm text-muted-foreground">
            {t('quiz.answerAll')}
          </span>
        )}
        <Button disabled={!allAnswered || isSubmitting} onClick={handleSubmit}>
          {t('quiz.submit')}
        </Button>
      </div>
    </div>
  );
}
