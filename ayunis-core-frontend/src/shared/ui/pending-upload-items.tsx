import { Fragment } from 'react/jsx-runtime';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@ayunis/ui/components/item';
import { Progress } from '@ayunis/ui/components/progress';
import type { PendingSourceUpload } from '@/shared/lib/source-upload';

/** Files still being transferred to storage, listed apart from processing sources. */
export function PendingUploadItems({
  uploads,
}: Readonly<{ uploads: PendingSourceUpload[] }>) {
  const { t } = useTranslation('common');
  if (uploads.length === 0) return null;
  return (
    <ItemGroup data-testid="pending-uploads">
      {uploads.map((upload, index) => {
        const percent = Math.round(upload.progress * 100);
        return (
          <Fragment key={upload.id}>
            <Item data-testid="pending-upload" data-upload-progress={percent}>
              <ItemMedia variant="icon">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{upload.fileName}</ItemTitle>
                <ItemDescription>
                  {t('sources.uploading', { percent })}
                </ItemDescription>
                <Progress value={percent} className="mt-1 h-1.5" />
              </ItemContent>
            </Item>
            {index < uploads.length - 1 && <ItemSeparator />}
          </Fragment>
        );
      })}
    </ItemGroup>
  );
}
