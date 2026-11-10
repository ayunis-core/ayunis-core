import { useState } from 'react';
import type {
  ChapterModuleProgress,
  ModuleProgressState,
} from '@/features/academy';

interface EntryState {
  moduleId: string;
  state: ModuleProgressState;
}

export function useProgressWhileWatching(
  moduleProgress: ChapterModuleProgress,
  activeModuleId: string | undefined,
  isProgressLoaded: boolean,
): ChapterModuleProgress {
  const [entry, setEntry] = useState<EntryState>();
  const activeModule = moduleProgress.modules.find(
    ({ courseModule }) => courseModule.id === activeModuleId,
  );

  if (
    activeModule &&
    isProgressLoaded &&
    entry?.moduleId !== activeModule.courseModule.id
  ) {
    setEntry({
      moduleId: activeModule.courseModule.id,
      state: activeModule.state,
    });
  }

  if (
    moduleProgress.allComplete ||
    !activeModule ||
    entry?.moduleId !== activeModule.courseModule.id
  ) {
    return moduleProgress;
  }

  const modules = moduleProgress.modules.map((moduleEntry) =>
    moduleEntry === activeModule
      ? { ...moduleEntry, state: entry.state }
      : moduleEntry,
  );
  const completedCount = modules.filter(
    ({ state }) => state === 'complete',
  ).length;

  return {
    ...moduleProgress,
    modules,
    completedCount,
    allComplete: completedCount === modules.length,
  };
}
