export enum NotificationMediaType {
  IMAGE = 'image',
  LOOM = 'loom',
}

/** An image stored in the storage module, served only to the recipient. */
export interface NotificationImage {
  readonly type: NotificationMediaType.IMAGE;
  readonly storageKey: string;
  readonly contentType: string;
}

/** A Loom video, embedded by its `https://www.loom.com/embed/` URL. */
export interface NotificationLoomVideo {
  readonly type: NotificationMediaType.LOOM;
  readonly url: string;
}

export type NotificationMedia = NotificationImage | NotificationLoomVideo;
