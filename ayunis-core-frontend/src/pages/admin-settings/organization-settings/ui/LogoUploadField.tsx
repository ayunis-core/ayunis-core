import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Trash2, ImageIcon, AlertCircle } from 'lucide-react';
import { Input } from '@/shared/ui/shadcn/input';
import { Button } from '@/shared/ui/shadcn/button';
import { Alert, AlertDescription } from '@/shared/ui/shadcn/alert';

const MAX_FILE_SIZE = 512 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg'];

async function loadImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

interface LogoUploadFieldProps {
  currentUrl: string | null | undefined;
  pendingFile: File | null;
  removed: boolean;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onRemove: () => void;
}

export function LogoUploadField({
  currentUrl,
  pendingFile,
  removed,
  disabled,
  onChange,
  onRemove,
}: LogoUploadFieldProps) {
  const { t } = useTranslation('admin-settings-organization');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayUrl = preview ?? (removed ? null : (currentUrl ?? null));

  function resetInput() {
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function reject(messageKey: string) {
    setError(t(messageKey));
    onChange(null);
    resetInput();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      reject('organization.errorFileType');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      reject('organization.errorFileSize');
      return;
    }
    const dims = await loadImageDimensions(file);
    if (!dims || dims.width !== dims.height) {
      reject('organization.errorNotSquare');
      return;
    }

    setError(null);
    onChange(file);
  }

  function handleRemove() {
    setError(null);
    resetInput();
    onRemove();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="group relative size-20 p-0"
          aria-label={t(
            displayUrl
              ? 'organization.faviconReplace'
              : 'organization.faviconUpload',
          )}
        >
          <div className="flex size-20 items-center justify-center overflow-hidden rounded-md border border-dashed bg-muted/30">
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={t('organization.faviconCurrent')}
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon
                className="size-8 text-muted-foreground"
                aria-hidden="true"
              />
            )}
          </div>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            <Upload className="size-6 text-white" />
          </span>
        </Button>

        <div className="flex flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {displayUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={disabled}
              >
                <Trash2 className="mr-2 size-4" />
                {t('organization.faviconRemove')}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                <Upload className="mr-2 size-4" />
                {t('organization.faviconUpload')}
              </Button>
            )}
          </div>
          <p className="text-muted-foreground text-xs">
            {t('organization.faviconHint')}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={(e) => {
          void handleFileChange(e);
        }}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
