import { useMemo } from 'react';
import ChatInput from '@/widgets/chat-input';
import {
  SourceResponseDtoStatus,
  SourceResponseDtoType,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';
import {
  CONTEXT_ITEMS,
  type ContextItem,
} from '@/pages/chat-context-prototype/model/mock';

interface PrototypeChatInputProps {
  attachedIds: string[];
  processingIds: string[];
  selectedSkillId?: string;
  selectedSkillName?: string;
  onSkillRemove?: () => void;
}

export function PrototypeChatInput({
  attachedIds,
  processingIds,
  selectedSkillId,
  selectedSkillName,
  onSkillRemove,
}: Readonly<PrototypeChatInputProps>) {
  const attached = attachedIds.map((id) => CONTEXT_ITEMS[id]);
  const sources = useMemo(
    () =>
      attached
        .filter((item) => item.kind === 'file')
        .map((item: ContextItem) => ({
          id: item.id,
          name: item.name,
          type: SourceResponseDtoType.data,
          status: processingIds.includes(item.id)
            ? SourceResponseDtoStatus.processing
            : SourceResponseDtoStatus.ready,
        })),
    [attached, processingIds],
  );
  return (
    <ChatInput
      modelId={undefined}
      sources={sources}
      knowledgeBases={[]}
      mcpIntegrations={[]}
      isAnonymous={false}
      isEmbeddingModelEnabled
      isVisionEnabled
      selectedSkillId={selectedSkillId}
      selectedSkillName={selectedSkillName}
      onSkillRemove={onSkillRemove}
      onModelChange={() => {}}
      onFileUpload={() => {}}
      onRemoveSource={() => {}}
      onDownloadSource={() => {}}
      onSend={() => {}}
      onCancel={() => {}}
    />
  );
}
