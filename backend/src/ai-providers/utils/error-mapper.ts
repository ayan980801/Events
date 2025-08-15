import { ProviderError } from '../interfaces/ai-model-provider.interface';

export class ProviderErrorMapper {
  static mapOpenAIError(error: any): ProviderError {
    const message = error.message || 'Unknown OpenAI error';
    
    // OpenAI-specific error mapping
    if (error.status === 429) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        type: 'rate_limit',
        retryable: true,
      };
    }
    
    if (error.status === 401) {
      return {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key or authentication failed.',
        type: 'authentication',
        retryable: false,
      };
    }
    
    if (error.status === 400) {
      return {
        code: 'INVALID_REQUEST',
        message: `Invalid request: ${message}`,
        type: 'invalid_request',
        retryable: false,
      };
    }
    
    if (error.status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'OpenAI server error. Please try again later.',
        type: 'server_error',
        retryable: true,
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: `OpenAI error: ${message}`,
      type: 'unknown',
      retryable: false,
    };
  }

  static mapAnthropicError(error: any): ProviderError {
    const message = error.message || 'Unknown Anthropic error';
    
    // Anthropic-specific error mapping
    if (error.status === 429) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        type: 'rate_limit',
        retryable: true,
      };
    }
    
    if (error.status === 401) {
      return {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key or authentication failed.',
        type: 'authentication',
        retryable: false,
      };
    }
    
    if (error.status === 400) {
      return {
        code: 'INVALID_REQUEST',
        message: `Invalid request: ${message}`,
        type: 'invalid_request',
        retryable: false,
      };
    }
    
    if (error.status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'Anthropic server error. Please try again later.',
        type: 'server_error',
        retryable: true,
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: `Anthropic error: ${message}`,
      type: 'unknown',
      retryable: false,
    };
  }

  static mapMistralError(error: any): ProviderError {
    const message = error.message || 'Unknown Mistral error';
    
    // Mistral-specific error mapping
    if (error.status === 429) {
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Please try again later.',
        type: 'rate_limit',
        retryable: true,
      };
    }
    
    if (error.status === 401) {
      return {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key or authentication failed.',
        type: 'authentication',
        retryable: false,
      };
    }
    
    if (error.status === 400) {
      return {
        code: 'INVALID_REQUEST',
        message: `Invalid request: ${message}`,
        type: 'invalid_request',
        retryable: false,
      };
    }
    
    if (error.status >= 500) {
      return {
        code: 'SERVER_ERROR',
        message: 'Mistral server error. Please try again later.',
        type: 'server_error',
        retryable: true,
      };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: `Mistral error: ${message}`,
      type: 'unknown',
      retryable: false,
    };
  }

  static mapGenericError(error: any, providerName: string): ProviderError {
    return {
      code: 'UNKNOWN_ERROR',
      message: `${providerName} error: ${error.message || 'Unknown error'}`,
      type: 'unknown',
      retryable: false,
    };
  }
}