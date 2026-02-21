import { useContext } from 'react';
import { ChatContext } from './chatContext';

export function useChatContext() {
  return useContext(ChatContext);
}
