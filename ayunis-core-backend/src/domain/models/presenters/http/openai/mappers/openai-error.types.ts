export interface OpenAIErrorEnvelope {
  error: {
    type:
      | 'invalid_request_error'
      | 'authentication_error'
      | 'permission_error'
      | 'server_error';
    message: string;
    code?: string;
  };
}

export type ErrorType = OpenAIErrorEnvelope['error']['type'];

export interface Mapped {
  status: number;
  body: OpenAIErrorEnvelope;
}
