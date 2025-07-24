/** !!These types are also used as tool names!! */
export enum ToolType {
  HTTP = 'http',
  SOURCE_QUERY = 'source_query',
  INTERNET_SEARCH = 'internet_search',
  WEBSITE_CONTENT = 'website_content',
  CUSTOM = 'custom', // Custom tool type for external tool definitions
}

export const configurableToolTypes = [ToolType.HTTP];
export const contextualToolTypes = [ToolType.SOURCE_QUERY];
