import type { ArtifactResponseDto } from '@/shared/api';
import { Button } from '@/shared/ui/shadcn/button';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { JsxRenderer } from './JsxRenderer';
import { JsxExportButton } from './JsxExportButton';
import { VersionHistory } from '@/widgets/artifact-editor';

interface JsxViewerProps {
  readonly artifact: ArtifactResponseDto;
  readonly onClose: () => void;
}

export function JsxViewer({ artifact, onClose }: JsxViewerProps) {
  const { t } = useTranslation('artifacts');
  const [userSelectedVersion, setUserSelectedVersion] = useState<number | null>(
    null,
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const displayedVersionNumber =
    userSelectedVersion ?? artifact.currentVersionNumber;

  const selectedVersion = artifact.versions?.find(
    (v) => v.versionNumber === displayedVersionNumber,
  );

  const source = selectedVersion?.content ?? '';

  return (
    <div className="flex h-full flex-col overflow-hidden border-l">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="truncate text-sm font-semibold" title={artifact.title}>
          {artifact.title}
        </h3>
        <div className="flex items-center gap-1">
          <JsxExportButton
            iframeRef={iframeRef}
            fileName={artifact.title}
            source={source}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClose}
            aria-label={t('jsx.close')}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <JsxRenderer source={source} iframeRef={iframeRef} />
      </div>

      {artifact.versions && artifact.versions.length > 0 && (
        <VersionHistory
          versions={artifact.versions}
          currentVersionNumber={displayedVersionNumber}
          onSelect={(v) =>
            setUserSelectedVersion(
              v === artifact.currentVersionNumber ? null : v,
            )
          }
        />
      )}
    </div>
  );
}
