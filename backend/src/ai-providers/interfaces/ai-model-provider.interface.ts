export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  userId?: string;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface StreamChunk {
  id: string;
  model: string;
  delta: {
    role?: 'assistant';
    content?: string;
  };
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  maxTokens: number;
  supportsStreaming: boolean;
  costPer1kTokens?: {
    input: number;
    output: number;
  };
}

export interface ProviderError {
  code: string;
  message: string;
  type: 'rate_limit' | 'invalid_request' | 'authentication' | 'server_error' | 'unknown';
  retryable: boolean;
}

export interface AIModelProvider {
  readonly name: string;
  readonly models: ModelInfo[];

  /**
   * Generate a chat completion
   */
  complete(options: ChatCompletionOptions): Promise<ChatCompletionResponse>;

  /**
   * Generate a streaming chat completion
   */
  stream(options: ChatCompletionOptions): AsyncIterable<StreamChunk>;

  /**
   * Get available models for this provider
   */
  getModels(): Promise<ModelInfo[]>;

  /**
   * Validate if the provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Health check for the provider
   */
  healthCheck(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }>;
}