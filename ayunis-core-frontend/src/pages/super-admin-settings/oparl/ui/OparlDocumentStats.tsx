import { useTranslation } from 'react-i18next';
import type {
  OparlDocumentStatsDto,
  OparlSkippedFilesDto,
} from '@ayunis/api-client';

const SKIP_REASONS: Array<keyof OparlSkippedFilesDto> = [
  'tooLarge',
  'tooManyPages',
  'unsupportedType',
  'unreadable',
];

export function OparlDocumentStats({
  documents,
}: Readonly<{ documents: OparlDocumentStatsDto }>) {
  const { t, i18n } = useTranslation('super-admin-settings-oparl');
  const number = (value: number) => value.toLocaleString(i18n.language);
  const { files, index } = documents;
  const skipped = SKIP_REASONS.filter((reason) => files.skipped[reason] > 0);

  return (
    <dl
      className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1"
      data-testid="oparl-document-stats"
    >
      <dt className="text-muted-foreground">{t('documents.files')}</dt>
      <dd className="tabular-nums">
        {t('documents.read', {
          extracted: number(files.extracted),
          total: number(files.total),
        })}
        {files.pending > 0 &&
          ` · ${t('documents.pending', { count: files.pending })}`}
        {files.failed > 0 &&
          ` · ${t('documents.failed', { count: files.failed })}`}
      </dd>
      {skipped.length > 0 && (
        <>
          <dt className="text-muted-foreground">{t('documents.skipped')}</dt>
          <dd className="tabular-nums">
            {skipped
              .map((reason) => {
                const label = t(`documents.skipReasons.${reason}`);
                return `${label}: ${number(files.skipped[reason])}`;
              })
              .join(' · ')}
          </dd>
        </>
      )}
      {files.lastError && (
        <>
          <dt className="text-muted-foreground">{t('documents.lastError')}</dt>
          <dd className="break-all text-destructive">{files.lastError}</dd>
        </>
      )}
      <dt className="text-muted-foreground">{t('documents.index')}</dt>
      <dd className="tabular-nums">
        {t('documents.chunks', {
          chunks: number(index.chunks),
          embedded: number(index.embeddedChunks),
        })}
      </dd>
    </dl>
  );
}
