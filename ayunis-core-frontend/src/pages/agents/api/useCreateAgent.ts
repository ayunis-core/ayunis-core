import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslation } from 'react-i18next';
import {
  agentsControllerCreate,
  getAgentsControllerFindAllQueryKey,
} from '@/shared/api/generated/ayunisCoreAPI';
import { ToolAssignmentDtoType } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useRouter } from '@tanstack/react-router';
import extractErrorData from '@/shared/api/extract-error-data';
import { showError } from '@/shared/lib/toast';

const createAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  instructions: z.string().min(1, 'Instructions are required'),
  modelId: z.string().min(1, 'Model is required'),
  toolAssignments: z.array(
    z.object({
      type: z.enum([
        ToolAssignmentDtoType.http,
        ToolAssignmentDtoType.source_query,
        ToolAssignmentDtoType.internet_search,
        ToolAssignmentDtoType.website_content,
      ]),
      toolConfigId: z.string().optional(),
    }),
  ),
});

export type CreateAgentData = z.infer<typeof createAgentSchema>;

export function useCreateAgent() {
  const { t } = useTranslation('agents');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<CreateAgentData>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: '',
      instructions: '',
      modelId: '',
      toolAssignments: [],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: CreateAgentData) => {
      return await agentsControllerCreate(data);
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindAllQueryKey(),
      });
      if (data && data.id) {
        void router.navigate({
          to: '/agents/$id',
          params: { id: data.id },
        });
      }
    },
    onError: (error) => {
      console.error('Create agent failed:', error);
      try {
        const { code } = extractErrorData(error);
        switch (code) {
          default:
            showError(t('create.error'));
        }
      } catch {
        // Non-AxiosError (network failure, request cancellation, etc.)
        showError(t('create.error'));
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindAllQueryKey(),
      });
      void router.invalidate();
    },
  });

  const onSubmit = (data: CreateAgentData) => {
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
