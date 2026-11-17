/**
 * A chat file in the shape the OpenAI Apps SDK `openai/fileParams` convention
 * hands to an MCP tool. `download_url` is a bearer credential: never log it.
 */
export interface ThreadFileObject {
  download_url: string;
  file_id: string;
  mime_type: string;
  file_name: string;
}
