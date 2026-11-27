import { useTranslation } from 'react-i18next';
import { Check, ExternalLink, FileText, Table2 } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import { cn } from '@ayunis/ui/lib/cn';
import type { ToolCardProps } from '@ayunis/chat/tool-cards';
import { useDemoState } from '@/pages/welcome-prototype/model/demo-state';

function paramText(toolUse: ToolCardProps['toolUse'], key: string) {
  const value = (toolUse.params as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

export function DemoArtifactCard({
  toolUse,
  kind,
}: Readonly<{
  toolUse: ToolCardProps['toolUse'];
  kind: 'document' | 'spreadsheet';
}>) {
  const { t } = useTranslation('chat');
  const { highlight, opened } = useDemoState();
  const tool = kind === 'document' ? 'create_document' : 'create_spreadsheet';
  const Icon = kind === 'document' ? FileText : Table2;

  return (
    <div className="my-2 w-full rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {paramText(toolUse, 'title')}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3" />
            {t(`chat.tools.${tool}.created`)}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8', highlight && !opened && 'wp-press')}
        >
          <ExternalLink className="mr-1 size-3.5" />
          {t(`chat.tools.${tool}.openInEditor`)}
        </Button>
      </div>
    </div>
  );
}

const ROUTINE_ROWS = (toolUse: ToolCardProps['toolUse']) => [
  ['Name', paramText(toolUse, 'name')],
  ['Aufgabe', paramText(toolUse, 'prompt')],
  ['Zeitplan', 'Jeden Montag, 8:00 Uhr'],
  ['Ergebnis', 'In Ihrem Posteingang'],
];

export function DemoRoutineCard({
  toolUse,
}: Readonly<{ toolUse: ToolCardProps['toolUse'] }>) {
  const { t } = useTranslation('chat');
  const { highlight, opened } = useDemoState();

  return (
    <div className="my-2 w-full space-y-4 rounded-lg border bg-card p-4 text-sm">
      <dl className="flex flex-col gap-2">
        {ROUTINE_ROWS(toolUse).map(([label, value]) => (
          <div key={label} className="flex gap-4">
            <dt className="w-24 shrink-0 text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Button
        disabled={opened}
        className={cn(highlight && !opened && 'wp-press')}
      >
        {opened && <Check />}
        {opened
          ? t('chat.tools.create_routine.created')
          : t('chat.tools.create_routine.create')}
      </Button>
    </div>
  );
}
