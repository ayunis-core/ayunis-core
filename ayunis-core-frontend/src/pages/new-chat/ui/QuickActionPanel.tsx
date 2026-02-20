import { ChevronRight, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/shared/ui/shadcn/card';
import { Separator } from '@/shared/ui/shadcn/separator';
import type {
  QuickActionCategory,
  QuickActionPrompt,
} from '../model/quickActionsData';
import { Item, ItemActions, ItemContent } from '@/shared/ui/shadcn/item';

interface QuickActionPanelProps {
  category: QuickActionCategory;
  onSelect: (prompt: QuickActionPrompt) => void;
  onClose: () => void;
}

export function QuickActionPanel({
  category,
  onSelect,
  onClose,
}: Readonly<QuickActionPanelProps>) {
  const { t } = useTranslation('quickActions');
  const Icon = category.icon;

  return (
    <Card className="gap-2 pb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="h-4 w-4" />
          <span>{t(category.labelKey)}</span>
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="p-0">
        <ul>
          {category.prompts.map((prompt, index) => (
            <li key={prompt.labelKey}>
              <Item
                className="px-6 hover:bg-accent/50 cursor-pointer"
                onClick={() => onSelect(prompt)}
              >
                <ItemContent>{t(prompt.labelKey)}</ItemContent>
                <ItemActions>
                  <ChevronRight className="h-4 w-4" />
                </ItemActions>
              </Item>
              {index < category.prompts.length - 1 && <Separator />}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
