import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { Input } from '@ayunis/ui/components/input';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { GlobalPiiWhitelistWordDto, PiiCategory } from '@/shared/api';
import { useAddGlobalWhitelistWord } from '../api/useAddGlobalWhitelistWord';
import { useDeleteGlobalWhitelistWord } from '../api/useDeleteGlobalWhitelistWord';

interface CategoryWordSectionProps {
  readonly category: PiiCategory;
  readonly words: GlobalPiiWhitelistWordDto[];
}

export function CategoryWordSection({
  category,
  words,
}: CategoryWordSectionProps) {
  const { t, i18n } = useTranslation('super-admin-settings-anonymization');
  const [input, setInput] = useState('');
  const { addWord, isPending: isAdding } = useAddGlobalWhitelistWord();
  const { deleteWord, isPending: isDeleting } = useDeleteGlobalWhitelistWord();

  function handleAdd() {
    const word = input.trim();
    if (word.length === 0) {
      return;
    }
    addWord({ category, word, onSuccess: () => setInput('') });
  }

  function formatAudit(word: GlobalPiiWhitelistWordDto): string {
    const date = new Date(word.createdAt).toLocaleDateString(i18n.language);
    return word.createdByEmail
      ? t('words.addedByOn', { email: word.createdByEmail, date })
      : t('words.addedOn', { date });
  }

  return (
    <Item variant="outline">
      <ItemContent>
        <ItemTitle>{t(`categories.${category}.label`)}</ItemTitle>
        <ItemDescription>
          {t(`categories.${category}.description`)}
        </ItemDescription>
      </ItemContent>
      <ItemFooter>
        <div className="w-full space-y-2">
          {words.length > 0 && (
            <ul className="space-y-1">
              {words.map((word) => (
                <li
                  key={word.id}
                  className="flex items-center justify-between rounded-md border px-3 py-1.5"
                >
                  <div className="flex min-w-0 items-baseline gap-3">
                    <span className="truncate text-sm font-medium">
                      {word.word}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatAudit(word)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('words.deleteLabel', { word: word.word })}
                    disabled={isDeleting}
                    onClick={() => deleteWord(word.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              handleAdd();
            }}
          >
            <Input
              value={input}
              placeholder={t('add.placeholder')}
              disabled={isAdding}
              onChange={(event) => setInput(event.target.value)}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={isAdding || input.trim().length === 0}
            >
              <Plus className="h-4 w-4" />
              {t('add.button')}
            </Button>
          </form>
        </div>
      </ItemFooter>
    </Item>
  );
}
