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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { useUpdateAgent } from '../api/useUpdateAgent';
import { useTranslation } from 'react-i18next';
import type { Agent } from '../model/openapi';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';

interface EditAgentDialogProps {
  selectedAgent: Agent;
  trigger: React.ReactNode;
}

export default function EditAgentDialog({
  selectedAgent,
  trigger,
}: EditAgentDialogProps) {
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
  } = useUpdateAgent({
    agentId: selectedAgent.id,
    onSuccessCallback: () => {
      setIsOpen(false);
      resetForm();
    },
  });

  const handleSubmit = (data: Parameters<typeof originalOnSubmit>[0]) => {
    const toolAssignments = internetSearchEnabled
      ? [{ type: ToolAssignmentDtoType.internet_search, isEnabled: true }]
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      // Check if agent has internet search tool
      const hasInternetSearch = selectedAgent.tools?.some(
        (tool) =>
          'type' in tool && tool.type === ToolAssignmentDtoType.internet_search,
      );
      setInternetSearchEnabled(hasInternetSearch || false);

      // Reset form with current agent data when opening
      form.reset({
        name: selectedAgent.name,
        instructions: selectedAgent.instructions,
        modelId:
          selectedAgent.model && 'id' in selectedAgent.model
            ? selectedAgent.model.id
            : '',
        toolAssignments: [],
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t('editDialog.title')}</DialogTitle>
          <DialogDescription>{t('editDialog.description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('editDialog.form.nameLabel')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('editDialog.form.namePlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('editDialog.form.instructionsLabel')}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('editDialog.form.instructionsPlaceholder')}
                      className="min-h-[150px] max-h-[200px]"
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
                  <FormLabel>{t('editDialog.form.modelLabel')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t('editDialog.form.modelPlaceholder')}
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
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FormLabel className="text-sm font-medium">
                  {t('editDialog.form.capabilitiesLabel')}
                </FormLabel>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('editDialog.form.capabilitiesTooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {t('editDialog.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('editDialog.buttons.saving')
                  : t('editDialog.buttons.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
