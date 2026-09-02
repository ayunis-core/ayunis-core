export interface DocumentSourceHit {
  id: string;
  kind: 'document';
  title: string;
  location: string;
  page: number;
  pageCount: number;
  heading: string;
  passage: string;
}

export interface WebSourceHit {
  id: string;
  kind: 'web';
  title: string;
  siteName: string;
  url: string;
  retrievedAt: string;
  passage: string;
}

export type SourceHit = DocumentSourceHit | WebSourceHit;
