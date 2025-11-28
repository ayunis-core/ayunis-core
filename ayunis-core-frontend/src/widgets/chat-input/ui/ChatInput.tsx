import { useState, forwardRef, useImperativeHandle } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button } from '@/shared/ui/shadcn/button';
import { ArrowUp, Square } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/shadcn/card';
import AgentButton from './AgentButton';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useTranslation } from 'react-i18next';
import type {
  SourceResponseDtoCreatedBy,
  SourceResponseDtoType,
} from '@/shared/api';
import PlusButton from './PlusButton';
import ModelSelector from './ModelSelector';
import { useAgents } from '../../../features/useAgents';
import TooltipIf from '@/widgets/tooltip-if/ui/TooltipIf';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/shared/ui/shadcn/tooltip';
import { AnonymousButton } from './AnonymousButton';
import { AgentBadge } from './AgentBadge';
import { SourceBadge } from './SourceBadge';

interface ChatInputProps {
  modelId: string | undefined;
  agentId: string | undefined;
  sources: {
    id: string;
    name: string;
    type: SourceResponseDtoType;
    createdBy?: SourceResponseDtoCreatedBy;
  }[];
  isStreaming?: boolean;
  isCreatingFileSource?: boolean;
  isModelChangeDisabled: boolean;
  isAgentChangeDisabled?: boolean;
  isAnonymousChangeDisabled?: boolean;
  onModelChange: (modelId: string) => void;
  onAgentChange: (agentId: string) => void;
  onAgentRemove: (agentId: string) => void;
  onFileUpload: (file: File) => void;
  onRemoveSource: (sourceId: string) => void;
  onDownloadSource: (sourceId: string) => void;
  onSend: (message: string) => void;
  onSendCancelled: () => void;
  prefilledPrompt?: string;
  isEmbeddingModelEnabled: boolean;
  /** Whether anonymous mode is enabled (PII redaction). Only shown for new chats. */
  isAnonymous: boolean;
  /** Callback when anonymous mode is toggled. If not provided, toggle is hidden. */
  onAnonymousChange?: (isAnonymous: boolean) => void;
  /** Whether anonymous mode is enforced by the selected model. */
  isAnonymousEnforced?: boolean;
}

export interface ChatInputRef {
  setMessage: (message: string) => void;
}

const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(
  (
    {
      modelId,
      agentId,
      sources,
      isStreaming,
      isCreatingFileSource,
      isModelChangeDisabled,
      isAgentChangeDisabled,
      isAnonymousChangeDisabled,
      onModelChange,
      onAgentChange,
      onAgentRemove,
      onFileUpload,
      onRemoveSource,
      onDownloadSource,
      onSend,
      onSendCancelled,
      prefilledPrompt,
      isEmbeddingModelEnabled,
      isAnonymous,
      onAnonymousChange,
      isAnonymousEnforced,
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);
    const [message, setMessage] = useState(prefilledPrompt ?? '');
    const { t } = useTranslation('common');
    const { agents } = useAgents();

    useImperativeHandle(ref, () => ({
      setMessage,
    }));

    function handleSend() {
      if (!message.trim() || !(modelId || agentId)) return;

      onSend(message);
      setMessage(''); // Clear message after sending
    }

    useKeyboardShortcut(
      ['Enter'],
      () => {
        if (isFocused) {
          handleSend();
        }
      },
      {
        exclusive: true,
      },
    );

    function handlePromptSelect(promptContent: string) {
      // Add the prompt content to the existing message
      // If there's already content, add a space before the prompt
      setMessage((prev) => (prev ? `${prev} ${promptContent}` : promptContent));
    }

    return (
      <div className="w-full space-y-2" data-testid="chat-input">
        {/* Main input section */}
        <Card className="py-4">
          <CardContent className="px-4">
            <div className="flex flex-col gap-4">
              {/* Sources */}
              {sources.filter((source) => source.createdBy !== 'system')
                .length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                  {sources
                    .filter((source) => source.createdBy !== 'system')
                    .map((source) => (
                      <SourceBadge
                        key={source.id}
                        source={source}
                        onRemove={onRemoveSource}
                        onDownload={onDownloadSource}
                      />
                    ))}
                </div>
              )}

              {/* Textarea at the top */}
              <TextareaAutosize
                maxRows={10}
                value={message}
                autoFocus
                onChange={(e) => setMessage(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={t('chatInput.placeholder')}
                className="border-0 border-none bg-transparent rounded-none resize-none focus:outline-none p-0"
                data-testid="input"
              />

              {/* Bottom row */}
              <div className="flex items-center justify-between">
                {/* Left side */}
                <div className="flex-shrink-0 flex space-x-2">
                  <PlusButton
                    onFileUpload={onFileUpload}
                    isFileSourceDisabled={!isEmbeddingModelEnabled}
                    isCreatingFileSource={isCreatingFileSource}
                    onPromptSelect={handlePromptSelect}
                  />
                  <AgentButton
                    selectedAgentId={agentId}
                    onAgentChange={onAgentChange}
                    isDisabled={isAgentChangeDisabled}
                  />
                  <AnonymousButton
                    isAnonymous={isAnonymous}
                    onAnonymousChange={onAnonymousChange}
                    isDisabled={isAnonymousChangeDisabled}
                    isEnforced={isAnonymousEnforced}
                  />
                  {agentId && (
                    <AgentBadge
                      agentId={agentId}
                      agent={agents.find((a) => a.id === agentId)}
                      isDisabled={isAgentChangeDisabled ?? false}
                      onRemove={onAgentRemove}
                    />
                  )}
                </div>

                {/* Right side */}
                <div className="flex-shrink-0 flex space-x-2">
                  <TooltipIf
                    condition={isModelChangeDisabled}
                    tooltip={t('chatInput.modelChangeDisabledTooltip')}
                  >
                    <ModelSelector
                      isDisabled={isModelChangeDisabled}
                      selectedModelId={modelId}
                      onModelChange={onModelChange}
                    />
                  </TooltipIf>
                  {isStreaming ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            size="icon"
                            className="rounded-full"
                            onClick={onSendCancelled}
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('chatInput.cancelTooltip')}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Button
                            disabled={!message.trim() || !(modelId || agentId)}
                            className="rounded-full"
                            size="icon"
                            data-testid="send"
                            onClick={() => void handleSend()}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('chatInput.sendTooltip')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
