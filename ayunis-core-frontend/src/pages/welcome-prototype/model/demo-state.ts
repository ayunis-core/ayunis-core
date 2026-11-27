import { createContext, useContext } from 'react';

export interface DemoState {
  highlight: boolean;
  opened: boolean;
}

export const DemoStateContext = createContext<DemoState>({
  highlight: false,
  opened: false,
});

export function useDemoState() {
  return useContext(DemoStateContext);
}
