import { useState, useEffect } from 'react';
import { Form } from '@/shared/ui/shadcn/form';
import { type CreateAgentData, useCreateAgent } from '../api/useCreateAgent';
import { usePermittedModels } from '@/features/usePermittedModels';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useModelsControllerGetEffectiveDefaultModel } from '@/shared/api/generated/ayunisCoreAPI';
import {
  CreateEntityDialog,
  useCreateDialogTranslations,
} from '@/widgets/create-entity-dialog';
import {
  NameField,
  ModelSelectorField,
  InstructionsField,
} from '@/widgets/entity-form-fields';

interface CreateAgentDialogProps {
  buttonText?: string;
  showIcon?: boolean;
  buttonClassName?: string;
}

export default function CreateAgentDialog({
  buttonText,
  showIcon = false,
  buttonClassName = '',
}: Readonly<CreateAgentDialogProps>) {
  const translations = useCreateDialogTranslations('agents');
  const [isOpen, setIsOpen] = useState(false);
  // eslint-disable-next-line sonarjs/todo-tag -- Placeholder for future agent tools feature
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

  const { data: defaultModelData } =
    useModelsControllerGetEffectiveDefaultModel();

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
    <CreateEntityDialog
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onCancel={handleCancel}
      onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
      isLoading={isLoading}
      translations={translations}
      buttonText={buttonText}
      showIcon={showIcon}
      buttonClassName={buttonClassName}
    >
      <Form {...form}>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <NameField
              control={form.control}
              name="name"
              translationNamespace="agents"
            />
            <ModelSelectorField
              control={form.control}
              name="modelId"
              translationNamespace="agents"
              models={models}
            />
          </div>
          <InstructionsField
            control={form.control}
            name="instructions"
            translationNamespace="agents"
          />
        </div>
      </Form>
    </CreateEntityDialog>
  );
}
