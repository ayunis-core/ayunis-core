import { createContext, useContext } from 'react';

// True when the app runs inside the Outlook task pane. The web app never sets
// it, so every embedded branch must leave the web rendering untouched.
export const EmbeddedContext = createContext(false);

export function useEmbedded(): boolean {
  return useContext(EmbeddedContext);
}
