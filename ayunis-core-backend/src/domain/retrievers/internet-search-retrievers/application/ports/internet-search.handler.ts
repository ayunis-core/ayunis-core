import { InternetSearchResult } from '../../domain/internet-search-result.entity';

export abstract class InternetSearchHandler {
  abstract search(query: string): Promise<InternetSearchResult[]>;
}
