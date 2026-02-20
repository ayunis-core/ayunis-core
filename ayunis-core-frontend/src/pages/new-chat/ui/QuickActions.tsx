import { useState, useRef, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import { QUICK_ACTIONS } from '../model/quickActionsData';
import { QuickActionPanel } from './QuickActionPanel';

interface QuickActionsProps {
  onPromptSelect: (text: string) => void;
}

export function QuickActions({ onPromptSelect }: Readonly<QuickActionsProps>) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('quickActions');

  const category = activeCategory
    ? QUICK_ACTIONS.find((c) => c.id === activeCategory)
    : null;

  useLayoutEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [activeCategory]);

  return (
    <div
      className="overflow-hidden transition-[height] duration-300 ease-out"
      style={{ height: height !== undefined ? `${height}px` : 'auto' }}
    >
      <div ref={contentRef}>
        {category ? (
          <QuickActionPanel
            category={category}
            onSelect={(prompt) => {
              onPromptSelect(t(prompt.contentKey));
              setActiveCategory(null);
            }}
            onClose={() => setActiveCategory(null)}
          />
        ) : (
          <div className="flex justify-center gap-2 flex-wrap">
            {QUICK_ACTIONS.map((cat) => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  <Icon />
                  {t(cat.labelKey)}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
