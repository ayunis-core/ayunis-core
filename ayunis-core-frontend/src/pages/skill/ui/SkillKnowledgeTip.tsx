import { BookOpenText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SkillKnowledgeTip() {
  const { t } = useTranslation('skill');
  return (
    <p
      className="flex items-start gap-2 px-1 text-sm text-muted-foreground"
      data-testid="skill-knowledge-tip"
    >
      <BookOpenText className="mt-0.5 size-4 shrink-0" />
      {t('knowledgeTip')}
    </p>
  );
}
