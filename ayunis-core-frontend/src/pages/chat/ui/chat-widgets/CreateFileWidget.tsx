import { useTranslation } from 'react-i18next';
import { Download, FileText } from 'lucide-react';
import { Button } from '@ayunis/ui/components/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@ayunis/ui/components/item';
import type { ToolUseMessageContent } from '@/pages/chat/model/openapi';
import {
  downloadTextFile,
  parseFileDownload,
  resolveFileContent,
} from '@/pages/chat/lib/create-file-download';
import { usePiiMasks } from '@/widgets/markdown';

export default function CreateFileWidget({
  content,
  isStreaming = false,
}: Readonly<{ content: ToolUseMessageContent; isStreaming?: boolean }>) {
  const { t } = useTranslation('chat');
  const masks = usePiiMasks();
  const file = isStreaming ? null : parseFileDownload(content.params, masks);

  function download() {
    if (!file) return;
    downloadTextFile({
      ...file,
      content: resolveFileContent(file, masks),
    });
  }

  return (
    <Item
      variant="outline"
      size="sm"
      className="my-2 w-full"
      data-testid="create-file-widget"
    >
      <ItemMedia variant="icon">
        <FileText />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="break-all" data-testid="create-file-name">
          {file?.filename ?? t('chat.tools.create_file.preparing')}
        </ItemTitle>
        <ItemDescription>
          {file?.format.toUpperCase() ??
            t('chat.tools.create_file.description')}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="w-full justify-end sm:w-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!file}
          onClick={download}
          data-testid="create-file-download"
        >
          <Download />
          {t('chat.tools.create_file.download')}
        </Button>
      </ItemActions>
    </Item>
  );
}
