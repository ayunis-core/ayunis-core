import { useTranslation } from 'react-i18next';
import { CheckCircle2, RotateCcw, Trophy, XCircle } from 'lucide-react';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import type { QuizResultResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface QuizResultCardProps {
  result: QuizResultResponseDto;
  onRetry: () => void;
  onBackToAcademy: () => void;
}

export default function QuizResultCard({
  result,
  onRetry,
  onBackToAcademy,
}: Readonly<QuizResultCardProps>) {
  const { t } = useTranslation('academy');

  return (
    <Card className="mx-auto max-w-[600px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" />
          )}
          {result.passed ? t('quiz.passed.title') : t('quiz.failed.title')}
        </CardTitle>
        <CardDescription>
          {t('quiz.result.score', {
            correct: result.correctCount,
            total: result.totalCount,
            score: result.score,
          })}
          {' — '}
          {t('quiz.result.required', { required: result.requiredCount })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.academyCompleted && (
          <div className="flex items-start gap-2 rounded-lg border bg-muted p-3">
            <Trophy className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium">{t('quiz.completed.title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('quiz.completed.description')}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {result.passed ? (
            <Button onClick={onBackToAcademy}>{t('quiz.backToAcademy')}</Button>
          ) : (
            <Button onClick={onRetry}>
              <RotateCcw className="h-4 w-4" />
              {t('quiz.retry')}
            </Button>
          )}
          {result.passed && (
            <Button variant="outline" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" />
              {t('quiz.retry')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
