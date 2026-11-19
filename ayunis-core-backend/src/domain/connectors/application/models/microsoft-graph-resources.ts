/** The parts of Microsoft Graph resources SharePoint sync reads. */

export interface GraphSite {
  id: string;
  displayName?: string;
  webUrl: string;
}

export interface GraphDrive {
  id: string;
  name: string;
  webUrl: string;
  driveType?: string;
}

export interface GraphDriveItem {
  id: string;
  name?: string;
  webUrl?: string;
  parentReference?: { id?: string };
  file?: {
    mimeType?: string;
    /** SharePoint's content hash. */
    hashes?: { quickXorHash?: string };
  };
  folder?: { childCount?: number };
  /** Set on delta entries of deleted items, which carry little else. */
  deleted?: object;
  /** Set on the drive's root. */
  root?: object;
  /**
   * Changes with the content, unlike `eTag`, but for Office documents also
   * with a rename or move, which make SharePoint write their properties.
   */
  cTag?: string;
  eTag?: string;
  size?: number;
}

export interface GraphPage<T> {
  value: T[];
  '@odata.nextLink'?: string;
  /** On the last page of a delta query: where the next one starts. */
  '@odata.deltaLink'?: string;
}

export const DELTA_SELECT =
  '$select=id,name,parentReference,file,folder,deleted,root,cTag,eTag,size';
