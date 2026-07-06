export interface OpenAIModelObject {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
}

export interface OpenAIModelListResponse {
  object: 'list';
  data: OpenAIModelObject[];
}
