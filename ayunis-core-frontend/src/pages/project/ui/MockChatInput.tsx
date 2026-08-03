import ChatInput from '@/widgets/chat-input';

interface MockChatInputProps {
  onSend?: () => void;
}

export function MockChatInput({ onSend }: Readonly<MockChatInputProps>) {
  return (
    <ChatInput
      modelId={undefined}
      sources={[]}
      knowledgeBases={[]}
      mcpIntegrations={[]}
      isAnonymous={false}
      isModelChangeDisabled
      isAnonymousChangeDisabled
      submissionState="idle"
      onModelChange={() => {}}
      onFileUpload={() => {}}
      onRemoveSource={() => {}}
      onDownloadSource={() => {}}
      onAddKnowledgeBase={() => {}}
      onRemoveKnowledgeBase={() => {}}
      onAddIntegration={() => {}}
      onRemoveIntegration={() => {}}
      onSend={() => onSend?.()}
      onCancel={() => {}}
      isEmbeddingModelEnabled={false}
      isVisionEnabled={false}
    />
  );
}
