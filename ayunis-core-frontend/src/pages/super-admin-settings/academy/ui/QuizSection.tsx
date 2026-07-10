import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type {
  QuizQuestionResponseDto,
  SuperAdminAcademyChapterResponseDto,
} from '@/shared/api';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemTitle,
} from '@/shared/ui/shadcn/item';
import { Button } from '@/shared/ui/shadcn/button';
import { Switch } from '@/shared/ui/shadcn/switch';
import { Label } from '@/shared/ui/shadcn/label';
import { Input } from '@/shared/ui/shadcn/input';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { QuestionFormDialog } from './QuestionFormDialog';
import { useDeleteQuestion } from '../api/useDeleteQuestion';
import { useSetChapterQuizEnabled } from '../api/useSetChapterQuizEnabled';

interface QuizSectionProps {
  chapter: SuperAdminAcademyChapterResponseDto;
}

export function QuizSection({ chapter }: Readonly<QuizSectionProps>) {
  const { t } = useTranslation('super-admin-settings-academy');
  const [dialogQuestion, setDialogQuestion] =
    useState<QuizQuestionResponseDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setQuizEnabled, setPassThreshold, isSettingQuiz } =
    useSetChapterQuizEnabled();
  const { deleteQuestion, isDeleting } = useDeleteQuestion();
  const { confirm } = useConfirmation();
  const [threshold, setThreshold] = useState(chapter.passThreshold);

  function commitThreshold() {
    // A cleared field yields NaN — revert to the saved value instead of
    // sending an invalid payload.
    if (Number.isNaN(threshold)) {
      setThreshold(chapter.passThreshold);
      return;
    }
    const clamped = Math.min(100, Math.max(1, Math.round(threshold)));
    if (clamped !== threshold) setThreshold(clamped);
    if (clamped !== chapter.passThreshold) setPassThreshold(chapter, clamped);
  }

  function openCreate() {
    setDialogQuestion(null);
    setDialogOpen(true);
  }

  function openEdit(question: QuizQuestionResponseDto) {
    setDialogQuestion(question);
    setDialogOpen(true);
  }

  function handleDelete(question: QuizQuestionResponseDto) {
    confirm({
      title: t('deleteQuestion.title'),
      description: t('deleteQuestion.description'),
      confirmText: t('deleteQuestion.confirm'),
      cancelText: t('deleteQuestion.cancel'),
      variant: 'destructive',
      onConfirm: () => deleteQuestion(question.id),
    });
  }

  const switchId = `quiz-enabled-${chapter.id}`;

  return (
    <div className="space-y-2 border-t pt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id={switchId}
            checked={chapter.quizEnabled}
            disabled={isSettingQuiz}
            onCheckedChange={(checked) => setQuizEnabled(chapter, checked)}
          />
          <Label htmlFor={switchId}>{t('quiz.enableLabel')}</Label>
        </div>
        <Button variant="outline" size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('quiz.addQuestion')}
        </Button>
      </div>

      {chapter.quizEnabled && (
        <div className="flex items-center gap-2">
          <Label htmlFor={`quiz-threshold-${chapter.id}`}>
            {t('quiz.thresholdLabel')}
          </Label>
          <Input
            id={`quiz-threshold-${chapter.id}`}
            type="number"
            min={1}
            max={100}
            className="w-20"
            value={threshold}
            disabled={isSettingQuiz}
            onChange={(e) => setThreshold(e.target.valueAsNumber)}
            onBlur={commitThreshold}
          />
          <span className="text-sm text-muted-foreground">
            {t('quiz.thresholdSuffix')}
          </span>
        </div>
      )}

      {chapter.quizQuestions.length === 0 ? (
        <p className="py-1 text-sm text-muted-foreground">
          {t('quiz.noQuestions')}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {chapter.quizQuestions.map((question) => (
            <Item key={question.id} variant="outline" size="sm">
              <ItemContent>
                <ItemTitle>{question.text}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(question)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(question)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </div>
      )}

      <QuestionFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setDialogQuestion(null);
        }}
        chapterId={chapter.id}
        question={dialogQuestion}
      />
    </div>
  );
}
