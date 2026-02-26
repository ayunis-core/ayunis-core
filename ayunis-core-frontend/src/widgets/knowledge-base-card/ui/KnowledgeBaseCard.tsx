import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import { Badge } from '@/shared/ui/shadcn/badge';
import { FileText, Loader, X } from 'lucide-react';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { showError } from '@/shared/lib/toast';

export interface Source {
  id: string;
  name: string;
}

export interface SourcesHook {
  sources: Source[];
  isLoadingSources: boolean;
  addFileSource: (params: { id: string; data: { file: File } }) => void;
  addFileSourcePending: boolean;
  removeSource: (sourceId: string) => void;
  removeSourcePending: boolean;
}

interface KnowledgeBaseCardProps {
  entity: { id: string };
  isEnabled: boolean;
  disabled?: boolean;
  translationNamespace: string;
  sourcesHook: SourcesHook;
}

export default function KnowledgeBaseCard({
  entity,
  isEnabled,
  disabled = false,
  translationNamespace,
  sourcesHook,
}: Readonly<KnowledgeBaseCardProps>) {
  const { t } = useTranslation(translationNamespace);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sources,
    isLoadingSources,
    addFileSource,
    addFileSourcePending,
    removeSource,
    removeSourcePending,
  } = sourcesHook;

  function handleFileRemove(sourceId: string) {
    removeSource(sourceId);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!isEnabled) {
      showError(t('additionalDocuments.disabledTooltip'));
      return;
    }
    if (file) {
      addFileSource({
        id: entity.id,
        data: { file },
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('additionalDocuments.title')}</CardTitle>
        <CardDescription>
          {t('additionalDocuments.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Display existing sources */}
          {isLoadingSources && (
            <div className="text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!isLoadingSources && sources.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <Badge
                  key={source.id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1"
                  onClick={
                    disabled ? undefined : () => handleFileRemove(source.id)
                  }
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{source.name}</span>
                  {!disabled && (
                    <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                  )}
                </Badge>
              ))}
            </div>
          )}

          {/* Add Source Button */}
          {!disabled && (
            <>
              <Input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.docx,.pptx,.csv,.xlsx,.xls"
              />
              <TooltipIf
                condition={!isEnabled}
                tooltip={t('additionalDocuments.disabledTooltip')}
              >
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={addFileSourcePending || removeSourcePending}
                >
                  {addFileSourcePending
                    ? t('additionalDocuments.adding')
                    : t('additionalDocuments.addSource')}
                </Button>
              </TooltipIf>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
