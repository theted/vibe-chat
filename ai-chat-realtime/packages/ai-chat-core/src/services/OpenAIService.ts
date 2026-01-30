/**
 * OpenAI Service
 *
 * This service handles interactions with the OpenAI API.
 */

import { OpenAICompatibleService } from './base/OpenAICompatibleService.js';
import { OpenAIClient, OpenAIServiceConfig } from '../types/services.js';
import { AIServiceConfig, ServiceInitOptions, OpenAIMessage } from '../types/index.js';
import OpenAI from 'openai';

export class OpenAIService extends OpenAICompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, 'OpenAI');
  }

  /**
   * Create the OpenAI client with proper typing
   */
  protected createClient(apiKey: string, options?: ServiceInitOptions): OpenAIClient {
    const clientConfig: ConstructorParameters<typeof OpenAI>[0] = {
      apiKey
    };

    // Add organization if specified in config
    const openaiConfig = this.config as OpenAIServiceConfig;
    if (openaiConfig.organization) {
      clientConfig.organization = openaiConfig.organization;
    }

    // Add project if specified in config
    if (openaiConfig.project) {
      clientConfig.project = openaiConfig.project;
    }

    // Add base URL if specified
    const baseURL = this.getBaseURL();
    if (baseURL) {
      clientConfig.baseURL = baseURL;
    }

    // Add custom headers
    const defaultHeaders = this.getDefaultHeaders();
    if (Object.keys(defaultHeaders).length > 0) {
      clientConfig.defaultHeaders = defaultHeaders;
    }

    // Add timeout from options or config
    if (options?.timeout || this.config.timeout) {
      clientConfig.timeout = options?.timeout || this.config.timeout;
    }

    return new OpenAI(clientConfig) as OpenAIClient;
  }

  /**
   * OpenAI doesn't need custom message processing
   * Messages are used as-is from the base class formatting
   */
  protected processMessages(messages: OpenAIMessage[]): OpenAIMessage[] {
    return messages;
  }
}