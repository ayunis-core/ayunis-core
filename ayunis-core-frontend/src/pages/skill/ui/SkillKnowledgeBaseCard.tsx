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
import type { SkillResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useSkillSources } from '../api';
import { useTranslation } from 'react-i18next';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { showError } from '@/shared/lib/toast';

interface SkillKnowledgeBaseCardProps {
  skill: SkillResponseDto;
  isEnabled: boolean;
}

export default function SkillKnowledgeBaseCard({
  skill,
  isEnabled,
}: SkillKnowledgeBaseCardProps) {
  const { t } = useTranslation('skill');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    sources,
    isLoadingSources,
    addFileSource,
    addFileSourcePending,
    removeSource,
    removeSourcePending,
  } = useSkillSources({ skill });

  function handleFileRemove(sourceAssignmentId: string) {
    removeSource(sourceAssignmentId);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!isEnabled) {
      showError(t('knowledgeBase.disabledTooltip'));
      return;
    }
    if (file) {
      addFileSource({
        id: skill.id,
        data: { file },
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('knowledgeBase.title')}</CardTitle>
        <CardDescription>{t('knowledgeBase.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoadingSources ? (
            <div className="text-sm text-muted-foreground">
              <Loader className="h-4 w-4 animate-spin" />
            </div>
          ) : sources.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => (
                <Badge
                  key={source.id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1"
                  onClick={() => handleFileRemove(source.id)}
                >
                  <FileText className="h-4 w-4" />
                  <span className="text-sm">{source.name}</span>
                  <X className="h-3 w-3 cursor-pointer hover:text-destructive" />
                </Badge>
              ))}
            </div>
          ) : null}

          <Input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.docx,.pptx,.csv,.xlsx,.xls"
          />
          <TooltipIf
            condition={!isEnabled}
            tooltip={t('knowledgeBase.disabledTooltip')}
          >
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={addFileSourcePending || removeSourcePending}
            >
              {addFileSourcePending
                ? t('knowledgeBase.adding')
                : t('knowledgeBase.addSource')}
            </Button>
          </TooltipIf>
        </div>
      </CardContent>
    </Card>
  );
}
