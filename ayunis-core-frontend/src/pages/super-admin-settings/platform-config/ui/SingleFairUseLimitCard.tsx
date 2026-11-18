import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@ayunis/ui/components/card';
import { Input } from '@ayunis/ui/components/input';
import { Button } from '@ayunis/ui/components/button';
import { Label } from '@ayunis/ui/components/label';
import { Alert, AlertDescription } from '@ayunis/ui/components/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import useFairUseLimitEditor from '@/features/fair-use-limit-editor/useFairUseLimitEditor';
import type { FairUseTierLimit } from '@/pages/super-admin-settings/platform-config/api/useFairUseLimits';

type UseSetFairUseLimit = (options: { onSuccessCallback?: () => void }) => {
  mutate: (input: FairUseTierLimit) => void;
  isPending: boolean;
};

interface SingleFairUseLimitCardProps {
  readonly translationPrefix: 'imageFairUseLimit' | 'recordingFairUseLimit';
  /** Prefix of the input ids and test ids, e.g. `image-fair-use`. */
  readonly idPrefix: string;
  readonly current: FairUseTierLimit | undefined;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly useSetLimit: UseSetFairUseLimit;
}

type EditorProps = Pick<
  SingleFairUseLimitCardProps,
  'translationPrefix' | 'idPrefix' | 'current' | 'useSetLimit'
>;

function Editor({
  translationPrefix,
  idPrefix,
  current,
  useSetLimit,
}: EditorProps) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const editor = useFairUseLimitEditor({
    current,
    validationKeyPrefix: translationPrefix,
  });
  const { mutate, isPending } = useSetLimit({
    onSuccessCallback: editor.handleCancel,
  });

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-limit`}>
          {t(`${translationPrefix}.limit`)}
        </Label>
        <div className="w-32">
          <Input
            id={`${idPrefix}-limit`}
            data-testid={`${idPrefix}-limit`}
            type="number"
            min="1"
            step="1"
            value={editor.limitValue}
            onChange={(e) => editor.updateField('limit', e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-window`}>
          {t(`${translationPrefix}.windowHours`)}
        </Label>
        <div className="w-32">
          <Input
            id={`${idPrefix}-window`}
            data-testid={`${idPrefix}-window`}
            type="number"
            min="0.01"
            step="any"
            value={editor.windowValue}
            onChange={(e) => editor.updateField('windowHours', e.target.value)}
            disabled={isPending}
          />
        </div>
      </div>
      {editor.isEditing && (
        <div className="flex gap-2">
          <Button
            size="sm"
            data-testid={`${idPrefix}-save`}
            onClick={() => editor.handleSave(mutate)}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(`${translationPrefix}.save`)}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={editor.handleCancel}
            disabled={isPending}
          >
            {t(`${translationPrefix}.cancel`)}
          </Button>
        </div>
      )}
    </div>
  );
}

/** A fair-use limit with a single bucket: one limit and one window. */
export default function SingleFairUseLimitCard({
  isLoading,
  isError,
  ...editorProps
}: SingleFairUseLimitCardProps) {
  const { t } = useTranslation('super-admin-settings-platform-config');
  const { translationPrefix, idPrefix } = editorProps;

  return (
    <Card data-testid={`${idPrefix}-section`}>
      <CardHeader>
        <CardTitle>{t(`${translationPrefix}.title`)}</CardTitle>
        <CardDescription>
          {t(`${translationPrefix}.description`)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t(`${translationPrefix}.loadError`)}
            </AlertDescription>
          </Alert>
        )}
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t(`${translationPrefix}.loading`)}
          </div>
        )}
        {!isLoading && !isError && <Editor {...editorProps} />}
      </CardContent>
    </Card>
  );
}
