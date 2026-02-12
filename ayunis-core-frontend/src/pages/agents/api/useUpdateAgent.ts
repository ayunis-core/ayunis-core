import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import { showSuccess, showError } from '@/shared/lib/toast';
import {
  agentsControllerUpdate,
  getAgentsControllerFindAllQueryKey,
  getAgentsControllerFindOneQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import extractErrorData from '@/shared/api/extract-error-data';
import { useRouter } from '@tanstack/react-router';

const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  instructions: z.string().min(1, 'Instructions are required'),
  modelId: z.string().min(1, 'Model is required'),
  toolAssignments: z.array(
    z.object({
      id: z.string().optional(),
      type: z.enum([
        ToolAssignmentDtoType.http,
        ToolAssignmentDtoType.source_query,
        ToolAssignmentDtoType.internet_search,
        ToolAssignmentDtoType.website_content,
      ]),
      toolConfigId: z.string().optional(),
      isEnabled: z.boolean(),
    }),
  ),
});

type UpdateAgentData = z.infer<typeof updateAgentSchema>;

interface UseUpdateAgentProps {
  agentId: string;
  onSuccessCallback?: () => void;
}

export function useUpdateAgent({
  agentId,
  onSuccessCallback,
}: UseUpdateAgentProps) {
  const { t } = useTranslation('agents');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<UpdateAgentData>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: '',
      instructions: '',
      modelId: '',
      toolAssignments: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateAgentData) => {
      return await agentsControllerUpdate(agentId, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindOneQueryKey(agentId),
      });
      void router.invalidate();
      showSuccess(t('update.success'));
      onSuccessCallback?.();
    },
    onError: (error) => {
      console.error('Update agent failed:', error);
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          case 'AGENT_NOT_FOUND':
            showError(t('update.notFound'));
            break;
          default:
            showError(t('update.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('update.error'));
      }
    },
  });

  const onSubmit = (data: UpdateAgentData) => {
    mutation.mutate(data);
  };

  const resetForm = () => {
    form.reset();
  };

  return {
    form,
    onSubmit,
    resetForm,
    isLoading: mutation.isPending,
  };
}
