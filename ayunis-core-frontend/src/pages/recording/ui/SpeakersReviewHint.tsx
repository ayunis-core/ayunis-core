import { ArrowRight, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';

export function SpeakersReviewHint({
  missing,
  total,
  onReview,
}: Readonly<{ missing: number; total: number; onReview: () => void }>) {
  const { t } = useTranslation('recordings');
  if (missing === 0) return null;
  return (
    <Item
      asChild
      variant="outline"
      size="sm"
      className="w-full border-brand/40 bg-brand/10 text-left hover:bg-brand/20"
    >
      <button
        type="button"
        onClick={onReview}
        data-testid="recording-speakers-review-hint"
      >
        <ItemMedia variant="icon" className="text-brand">
          <Users />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{t('detail.summary.speakersHint.title')}</ItemTitle>
          <ItemDescription className="line-clamp-none">
            {t('detail.summary.speakersHint.description', { missing, total })}
          </ItemDescription>
        </ItemContent>
        <ArrowRight className="size-4 shrink-0 text-brand" />
      </button>
    </Item>
  );
}
