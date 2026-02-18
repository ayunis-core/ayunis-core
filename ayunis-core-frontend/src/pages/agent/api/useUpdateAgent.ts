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
import type { AgentResponseDto } from '@/shared/api';
import { useRouter } from '@tanstack/react-router';

const updateAgentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  instructions: z.string().min(1, 'Instructions are required'),
  modelId: z.string().min(1, 'Model is required'),
});

type UpdateAgentData = z.infer<typeof updateAgentSchema>;

interface UseUpdateAgentProps {
  agent: AgentResponseDto;
}

export function useUpdateAgent({ agent }: UseUpdateAgentProps) {
  const { t } = useTranslation('agents');
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm<UpdateAgentData>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      name: agent.name,
      instructions: agent.instructions,
      modelId: agent.model.id,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: UpdateAgentData) => {
      return await agentsControllerUpdate(agent.id, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindAllQueryKey(),
      });
      void queryClient.invalidateQueries({
        queryKey: getAgentsControllerFindOneQueryKey(agent.id),
      });
      void router.invalidate();
      showSuccess(t('update.success'));
    },
    onError: () => {
      showError(t('update.error'));
    },
  });

  const onSubmit = (data: UpdateAgentData) => {
    mutation.mutate(data);
  };

  return {
    form,
    onSubmit,
    isLoading: mutation.isPending,
  };
}
