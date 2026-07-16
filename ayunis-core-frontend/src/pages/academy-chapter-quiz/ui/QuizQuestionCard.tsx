import { useTranslation } from 'react-i18next';
import type { QuizQuestionForTakingResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface QuizQuestionCardProps {
  question: QuizQuestionForTakingResponseDto;
  index: number;
  total: number;
  selectedIndex?: number;
  disabled?: boolean;
  onSelect: (optionIndex: number) => void;
}

export default function QuizQuestionCard({
  question,
  index,
  total,
  selectedIndex,
  disabled,
  onSelect,
}: Readonly<QuizQuestionCardProps>) {
  const { t } = useTranslation('academy');

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">
          {t('quiz.questionCounter', { current: index + 1, total })}
        </p>
        <h3 className="mt-1 font-medium whitespace-pre-line">
          {question.text}
        </h3>
      </div>
      <ul className="space-y-2">
        {question.options.map((option, optionIndex) => (
          <li key={optionIndex}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border p-2 hover:bg-muted">
              <input
                type="radio"
                name={`question-${question.id}`}
                className="h-4 w-4 shrink-0"
                checked={selectedIndex === optionIndex}
                disabled={disabled}
                onChange={() => onSelect(optionIndex)}
              />
              <span className="text-sm">{option.text}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
