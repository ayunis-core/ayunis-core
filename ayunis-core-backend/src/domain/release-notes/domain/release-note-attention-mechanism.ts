/** How Announcable wants a new note brought to the user's attention. */
export enum ReleaseNoteAttentionMechanism {
  /** Shown to the user right away, in a modal. */
  INSTANT_OPEN = 'instant_open',
  /** Only the unread dot and count. */
  SHOW_INDICATOR = 'show_indicator',
}
