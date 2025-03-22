/**
 * Base AI Service
 *
 * This abstract class defines the interface for all AI service implementations.
 * Each AI provider should extend this class and implement its methods.
 */

export class BaseAIService {
  constructor(config) {
    if (this.constructor === BaseAIService) {
      throw new Error(
        "BaseAIService is an abstract class and cannot be instantiated directly"
      );
    }

    this.config = config;
    this.name = "BaseAIService";
  }

  /**
   * Initialize the AI service
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error("Method 'initialize()' must be implemented");
  }

  /**
   * Generate a response based on the conversation history
   * @param {Array} messages - Array of message objects with role and content
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(messages) {
    throw new Error("Method 'generateResponse()' must be implemented");
  }

  /**
   * Check if the service is properly configured
   * @returns {boolean} True if the service is properly configured
   */
  isConfigured() {
    throw new Error("Method 'isConfigured()' must be implemented");
  }

  /**
   * Get the name of the AI service
   * @returns {string} The name of the AI service
   */
  getName() {
    return this.name;
  }

  /**
   * Get the model being used
   * @returns {string} The model ID
   */
  getModel() {
    return this.config.model.id;
  }
}
