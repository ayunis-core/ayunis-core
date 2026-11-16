import { useState, type ReactNode } from 'react';
import AppLayout from '@/layouts/app-layout';
import ChatInterfaceLayout from '@/layouts/chat-interface-layout/ui/ChatInterfaceLayout';
import ChatInput from '@/widgets/chat-input';
import { usePermittedModels } from '@/features/usePermittedModels';
import type { Scenario } from '@/pages/suggestion-prototype/model/scenarios';
import { PrototypeTranscript } from '@/pages/suggestion-prototype/ui/PrototypeTranscript';

interface PrototypeChatProps {
  scenario: Scenario;
  header: ReactNode;
}

export function PrototypeChat({
  scenario,
  header,
}: Readonly<PrototypeChatProps>) {
  const [replies, setReplies] = useState<string[]>([]);
  const [chosenModelId, setChosenModelId] = useState<string>();
  const { models } = usePermittedModels();
  const modelId = chosenModelId ?? models.at(0)?.id;
  const noop = () => undefined;

  return (
    <AppLayout>
      <ChatInterfaceLayout
        chatHeader={header}
        chatContent={
          <PrototypeTranscript scenario={scenario} replies={replies} />
        }
        chatInput={
          <ChatInput
            modelId={modelId}
            sources={[]}
            onModelChange={setChosenModelId}
            onFileUpload={noop}
            onRemoveSource={noop}
            onSend={(message) => setReplies((current) => [...current, message])}
            onCancel={noop}
            isEmbeddingModelEnabled={false}
            isAnonymous={false}
          />
        }
      />
    </AppLayout>
  );
}
