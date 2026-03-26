import { Fragment } from 'react/jsx-runtime';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/shared/ui/shadcn/card';
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemMedia,
  ItemGroup,
  ItemSeparator,
} from '@/shared/ui/shadcn/item';
import { FileText, Loader2, AlertCircle, Clock, X } from 'lucide-react';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import { showError } from '@/shared/lib/toast';
import { cn } from '@/shared/lib/shadcn/utils';
import { useDocumentDrop } from '@/shared/hooks/useDocumentDrop';

export interface Source {
  id: string;
  name: string;
  status?: string;
  processingError?: string;
  createdAt?: string;
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

const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.xlsx',
  '.xls',
];

export default function KnowledgeBaseCard({
  entity,
  isEnabled,
  disabled = false,
  translationNamespace,
  sourcesHook,
}: Readonly<KnowledgeBaseCardProps>) {
  const { t } = useTranslation(translationNamespace);
  const { t: tCommon } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    sources,
    isLoadingSources,
    addFileSource,
    addFileSourcePending,
    removeSource,
    removeSourcePending,
  } = sourcesHook;

  const { isDragging } = useDocumentDrop({
    containerRef: cardRef,
    onDrop: (file) => addFileSource({ id: entity.id, data: { file } }),
    acceptedExtensions: ACCEPTED_EXTENSIONS,
    disabled: disabled || !isEnabled,
  });

  return (
    <Card
      ref={cardRef}
      className={cn(
        'relative',
        isDragging && 'outline-2 outline-dashed outline-primary bg-primary/5',
      )}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/5">
          <p className="text-sm font-medium text-primary">
            {tCommon('chatInput.dropFilesHint')}
          </p>
        </div>
      )}
      <CardHeader>
        <CardTitle>{t('additionalDocuments.title')}</CardTitle>
        <CardDescription>
          {t('additionalDocuments.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoadingSources && (
            <div className="text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          {!isLoadingSources && sources.length > 0 && (
            <SourceList
              sources={sources}
              onRemove={removeSource}
              removeDisabled={removeSourcePending}
              disabled={disabled}
              translationNamespace={translationNamespace}
            />
          )}
          {!disabled && (
            <UploadButton
              fileInputRef={fileInputRef}
              isEnabled={isEnabled}
              addFileSource={addFileSource}
              entityId={entity.id}
              addFileSourcePending={addFileSourcePending}
              removeSourcePending={removeSourcePending}
              t={t}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SourceList({
  sources,
  onRemove,
  removeDisabled,
  disabled,
  translationNamespace,
}: Readonly<{
  sources: Source[];
  onRemove: (id: string) => void;
  removeDisabled: boolean;
  disabled: boolean;
  translationNamespace: string;
}>) {
  return (
    <ItemGroup>
      {sources.map((source, index) => (
        <Fragment key={source.id}>
          <SourceItem
            source={source}
            onRemove={onRemove}
            removeDisabled={removeDisabled}
            disabled={disabled}
            translationNamespace={translationNamespace}
          />
          {index < sources.length - 1 && <ItemSeparator />}
        </Fragment>
      ))}
    </ItemGroup>
  );
}

/** Processing sources older than this are shown with a slow-processing warning. */
const SLOW_PROCESSING_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes

function SourceItem({
  source,
  onRemove,
  removeDisabled,
  disabled,
  translationNamespace,
}: Readonly<{
  source: Source;
  onRemove: (id: string) => void;
  removeDisabled: boolean;
  disabled: boolean;
  translationNamespace: string;
}>) {
  const { t } = useTranslation(translationNamespace);
  const isProcessing = source.status === 'processing';
  const isFailed = source.status === 'failed';

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isProcessing) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isProcessing]);

  const isProcessingSlow =
    isProcessing &&
    !!source.createdAt &&
    now - new Date(source.createdAt).getTime() > SLOW_PROCESSING_THRESHOLD_MS;

  return (
    <Item>
      <ItemMedia variant="icon">
        <SourceItemIcon
          isProcessing={isProcessing}
          isProcessingSlow={isProcessingSlow}
          isFailed={isFailed}
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{source.name}</ItemTitle>
        <SourceItemDescription
          isProcessing={isProcessing}
          isProcessingSlow={isProcessingSlow}
          isFailed={isFailed}
          processingError={source.processingError}
          t={t}
        />
      </ItemContent>
      {!disabled && (
        <ItemActions>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(source.id)}
            disabled={removeDisabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </ItemActions>
      )}
    </Item>
  );
}

function SourceItemIcon({
  isProcessing,
  isProcessingSlow,
  isFailed,
}: Readonly<{
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
}>) {
  if (isProcessingSlow) {
    return (
      <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
    );
  }
  if (isProcessing) {
    return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />;
  }
  if (isFailed) {
    return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />;
  }
  return <FileText className="h-3.5 w-3.5 shrink-0" />;
}

function SourceItemDescription({
  isProcessing,
  isProcessingSlow,
  isFailed,
  processingError,
  t,
}: Readonly<{
  isProcessing: boolean;
  isProcessingSlow: boolean;
  isFailed: boolean;
  processingError: string | undefined;
  t: (key: string) => string;
}>) {
  if (isProcessing) {
    return (
      <ItemDescription
        className={
          isProcessingSlow ? 'text-amber-600 dark:text-amber-400' : undefined
        }
      >
        {isProcessingSlow
          ? t('additionalDocuments.statusProcessingSlow')
          : t('additionalDocuments.statusProcessing')}
      </ItemDescription>
    );
  }
  if (isFailed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ItemDescription className="text-destructive cursor-help">
            {t('additionalDocuments.statusFailed')}
          </ItemDescription>
        </TooltipTrigger>
        <TooltipContent>
          {processingError ?? t('additionalDocuments.retryUpload')}
        </TooltipContent>
      </Tooltip>
    );
  }
  return null;
}

function UploadButton({
  fileInputRef,
  isEnabled,
  addFileSource,
  entityId,
  addFileSourcePending,
  removeSourcePending,
  t,
}: Readonly<{
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  isEnabled: boolean;
  addFileSource: (params: { id: string; data: { file: File } }) => void;
  entityId: string;
  addFileSourcePending: boolean;
  removeSourcePending: boolean;
  t: (key: string) => string;
}>) {
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!isEnabled) {
      showError(t('additionalDocuments.disabledTooltip'));
      return;
    }
    if (file) {
      addFileSource({
        id: entityId,
        data: { file },
      });
    }
  }

  return (
    <>
      <Input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.docx,.pptx,.txt,.md,.csv,.xlsx,.xls"
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
  );
}
