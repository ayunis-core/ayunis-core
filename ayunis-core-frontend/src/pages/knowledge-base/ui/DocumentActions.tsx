import { Button } from '@/shared/ui/shadcn/button';
import { CardAction } from '@/shared/ui/shadcn/card';
import { Upload, Globe, Loader2 } from 'lucide-react';
import { HelpLink } from '@/shared/ui/help-link/HelpLink';

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.pptx,.txt,.md';

export function DocumentActions({
  fileInputRef,
  onFileChange,
  onOpenUrlDialog,
  isUploading,
  isAddingUrl,
  t,
}: Readonly<{
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenUrlDialog: () => void;
  isUploading: boolean;
  isAddingUrl: boolean;
  t: (key: string) => string;
}>) {
  return (
    <CardAction>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={onFileChange}
        className="hidden"
      />
      <div className="flex gap-2">
        <HelpLink
          path="knowledge-collections/create-and-upload/"
          variant="icon"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenUrlDialog}
          disabled={isAddingUrl}
        >
          {isAddingUrl ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Globe className="mr-2 h-4 w-4" />
          )}
          {t('detail.documents.addUrl')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Upload className="mr-2 h-4 w-4" />
          )}
          {t('detail.documents.upload')}
        </Button>
      </div>
    </CardAction>
  );
}
