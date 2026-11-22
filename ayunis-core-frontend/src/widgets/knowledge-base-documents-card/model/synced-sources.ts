import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { SyncedLocationResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/** How many of a location's documents finished processing, of all it has. */
export interface SyncProgress {
  processed: number;
  total: number;
}

/** An add menu entry that opens a dialog, such as SharePoint. */
export interface AddMenuEntry {
  key: string;
  label: string;
  icon: LucideIcon;
  testId: string;
  /** Called once the menu has closed, so the dialog keeps the focus. */
  openDialog: () => void;
}

/**
 * The synced locations shown among the documents. Their files are listed
 * under them, not on their own.
 */
export interface SyncedSources {
  /** `null` until the locations are known, so their files don't flash as loose documents. */
  locations: SyncedLocationResponseDto[] | null;
  addMenuEntries?: AddMenuEntry[];
  renderLocation: (
    location: SyncedLocationResponseDto,
    files: ReactNode,
    progress: SyncProgress,
  ) => ReactNode;
  /** Shown above the list, e.g. when the locations failed to load. */
  notice?: ReactNode;
  dialogs?: ReactNode;
}
