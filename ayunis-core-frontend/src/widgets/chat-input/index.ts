import ChatInput from './ui/ChatInput';

export type { ChatInputRef, ChatInputSubmissionState } from './ui/ChatInput';
export {
  useWebComposerConfiguration,
  type WebComposerConfigurationProps,
} from './model/useWebComposerConfiguration';
export { CHAT_INPUT_TEXT_INSET_CLASS } from './model/text-inset';
export default ChatInput;
