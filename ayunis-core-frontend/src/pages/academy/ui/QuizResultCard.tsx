import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Download,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { useDownloadCertificate } from '@/features/academy';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
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
  const { downloadCertificate, isDownloading } = useDownloadCertificate();

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
          <Item variant="muted">
            <ItemMedia variant="icon" className="text-brand">
              <Trophy />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{t('quiz.completed.title')}</ItemTitle>
              <ItemDescription>
                {t('quiz.completed.description')}
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
        <div className="flex flex-wrap gap-3">
          {result.academyCompleted && (
            <Button
              onClick={() => void downloadCertificate()}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" />
              {t('certificate.download')}
            </Button>
          )}
          {result.passed ? (
            <Button
              variant={result.academyCompleted ? 'outline' : 'default'}
              onClick={onBackToAcademy}
            >
              {t('quiz.backToAcademy')}
            </Button>
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
