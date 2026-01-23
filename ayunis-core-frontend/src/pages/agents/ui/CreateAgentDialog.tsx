import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/shadcn/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/ui/shadcn/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/shadcn/select';
import { Input } from '@/shared/ui/shadcn/input';
import { Textarea } from '@/shared/ui/shadcn/textarea';
import { Button } from '@/shared/ui/shadcn/button';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { type CreateAgentData, useCreateAgent } from '../api/useCreateAgent';
import { useTranslation } from 'react-i18next';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useModelsControllerGetEffectiveDefaultModel } from '@/shared/api/generated/ayunisCoreAPI';

interface CreateAgentDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
}

export default function CreateAgentDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
}: CreateAgentDialogProps) {
  const { t } = useTranslation('agents');
  const [isOpen, setIsOpen] = useState(false);
  // TODO: This is still here to keep the pattern of the create agent dialog
  // And should be extended as soon as there are agent tools
  const [internetSearchEnabled, setInternetSearchEnabled] = useState(false);
  const { models } = usePermittedModels();
  const {
    form,
    onSubmit: originalOnSubmit,
    resetForm,
    isLoading,
  } = useCreateAgent();

  // Fetch the user's effective default model
  const { data: defaultModelData } =
    useModelsControllerGetEffectiveDefaultModel();

  // Pre-select the default model when the dialog opens
  useEffect(() => {
    if (isOpen && defaultModelData?.permittedLanguageModel?.id) {
      form.setValue('modelId', defaultModelData.permittedLanguageModel.id);
    }
  }, [isOpen, defaultModelData, form]);

  const handleSubmit = (data: CreateAgentData) => {
    const toolAssignments = internetSearchEnabled
      ? [{ type: ToolAssignmentDtoType.internet_search }]
      : [];

    originalOnSubmit({
      ...data,
      toolAssignments,
    });
  };

  const handleCancel = () => {
    resetForm();
    setInternetSearchEnabled(false);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className={`${showIcon ? 'inline-flex items-center gap-2' : ''} ${buttonClassName}`}
        >
          {showIcon && <Plus className="h-4 w-4" />}
          {buttonText || t('createDialog.buttonText')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
          <DialogDescription>{t('createDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createDialog.form.nameLabel')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('createDialog.form.namePlaceholder')}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="modelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('createDialog.form.modelLabel')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={t(
                              'createDialog.form.modelPlaceholder',
                            )}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('createDialog.form.instructionsLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t(
                        'createDialog.form.instructionsPlaceholder',
                      )}
                      className="min-h-[150px] max-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {t('createDialog.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('createDialog.buttons.creating')
                  : t('createDialog.buttons.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
