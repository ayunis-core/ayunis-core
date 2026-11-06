import type { InternetSearchResultType } from './value-objects/internet-search-result-type.enum';

export class InternetSearchResult {
  public readonly title: string;
  public readonly url: string;
  public readonly description: string;
  public readonly type: InternetSearchResultType;
  public readonly pageAge?: string;
  public readonly extraSnippets?: string[];

  constructor(params: {
    title: string;
    url: string;
    description: string;
    type: InternetSearchResultType;
    pageAge?: string;
    extraSnippets?: string[];
  }) {
    this.title = params.title;
    this.url = params.url;
    this.description = params.description;
    this.type = params.type;
    this.pageAge = params.pageAge;
    this.extraSnippets = params.extraSnippets;
  }
}
