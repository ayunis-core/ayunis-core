import { useContext } from 'react';
import { EmbeddedContext } from './embeddedContext';

export function useEmbedded() {
  return useContext(EmbeddedContext);
}
