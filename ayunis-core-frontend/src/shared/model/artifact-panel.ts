export interface ArtifactPanelHandle {
  /** `onStay` runs instead of `onExit` when the user keeps editing. */
  requestExit: (onExit: () => void, onStay?: () => void) => void;
}
