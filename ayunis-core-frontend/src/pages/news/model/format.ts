import { NEWS_CATEGORIES, type NewsCategory } from '@/features/home-feed';

export const CATEGORY_LABEL = Object.fromEntries(
  NEWS_CATEGORIES.map((category) => [category.id, category.label]),
) as Record<NewsCategory, string>;

export const CATEGORY_KICKER: Record<NewsCategory, string> = {
  product: 'Produkt-Update',
  tips: 'Tipp',
  events: 'Termin',
};

export function formatNewsDate(iso: string): string {
  return new Date(iso).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
  });
}
