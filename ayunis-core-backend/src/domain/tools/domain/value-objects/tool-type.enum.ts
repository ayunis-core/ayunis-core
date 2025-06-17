/** !!These types are also used as tool names!! */
export enum ToolType {
  HTTP = 'http',
  SOURCE_QUERY = 'source_query',
  INTERNET_SEARCH = 'internet_search',
  WEBSITE_CONTENT = 'website_content',
}

export const configurableToolTypes = [ToolType.HTTP];
export const contextualToolTypes = [
  ToolType.SOURCE_QUERY,
  ToolType.INTERNET_SEARCH,
];
