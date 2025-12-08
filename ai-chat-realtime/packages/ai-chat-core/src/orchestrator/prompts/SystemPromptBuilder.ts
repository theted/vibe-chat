/**
 * System Prompt Builder
 *
 * Handles the generation and enhancement of system prompts for AI participants.
 * Extracted from ChatOrchestrator for better modularity and testability.
 */

import {
  ISystemPromptBuilder,
  PromptContext,
  PromptTemplate,
  SystemPromptBuilderConfig,
  AIParticipant,
  InteractionStrategy
} from '../../types/orchestrator.js';

export class SystemPromptBuilder implements ISystemPromptBuilder {
  private config: SystemPromptBuilderConfig;
  private templates: PromptTemplate;

  constructor(config?: Partial<SystemPromptBuilderConfig>) {
    this.config = {
      maxContextLength: 2000,
      includeParticipantInfo: true,
      includeStrategyHints: true,
      ...config,
      templates: this.getDefaultTemplates()
    };
    this.templates = this.config.templates;
  }

  /**
   * Build a complete system prompt for an AI participant
   */
  buildPrompt(
    basePrompt: string,
    context: PromptContext,
    participant: AIParticipant
  ): string {
    let prompt = basePrompt || this.templates.base;

    // Add participant-specific information
    if (this.config.includeParticipantInfo) {
      prompt += this.buildParticipantSection(participant, context);
    }

    // Add strategy-specific instructions
    if (this.config.includeStrategyHints && context.strategy) {
      prompt += this.buildStrategySection(context.strategy);
    }

    // Add contextual information
    if (context.recentContext) {
      prompt += this.buildContextSection(context.recentContext);
    }

    // Add conversation metadata
    prompt += this.buildMetadataSection(context);

    // Ensure prompt doesn't exceed maximum length
    return this.truncatePrompt(prompt, this.config.maxContextLength);
  }

  /**
   * Enhance context for a specific strategy
   */
  enhanceContextForStrategy(
    context: string,
    strategy: InteractionStrategy
  ): string {
    const strategyTemplate = this.templates.strategySpecific[strategy];
    if (!strategyTemplate) {
      return context;
    }

    return `${context}\n\n${strategyTemplate}`;
  }

  /**
   * Enhance context for topic changes
   */
  enhanceContextForTopicChange(
    context: string,
    newTopic: string,
    previousTopic?: string
  ): string {
    const topicChangeTemplate = this.templates.contextEnhancements.topicChange;

    let enhancement = topicChangeTemplate
      .replace('{{NEW_TOPIC}}', newTopic)
      .replace('{{PREVIOUS_TOPIC}}', previousTopic || 'the previous discussion');

    return `${context}\n\n${enhancement}`;
  }

  /**
   * Enhance context for comments or responses
   */
  enhanceContextForComment(
    context: string,
    comment: string
  ): string {
    const commentTemplate = this.templates.contextEnhancements.comment;
    const enhancement = commentTemplate.replace('{{COMMENT}}', comment);

    return `${context}\n\n${enhancement}`;
  }

  /**
   * Truncate response to maximum length while preserving sentence boundaries
   */
  truncateResponse(response: string, maxLength: number): string {
    if (response.length <= maxLength) {
      return response;
    }

    // Try to truncate at sentence boundaries
    const sentences = response.split(/[.!?]+/);
    let truncated = '';

    for (const sentence of sentences) {
      const potential = truncated + sentence + '.';
      if (potential.length > maxLength) {
        break;
      }
      truncated = potential;
    }

    // If no complete sentence fits, just truncate at word boundary
    if (truncated.length === 0) {
      const words = response.split(' ');
      for (const word of words) {
        const potential = truncated + (truncated ? ' ' : '') + word;
        if (potential.length > maxLength - 3) {
          break;
        }
        truncated = potential;
      }
      truncated += '...';
    }

    return truncated.trim();
  }

  /**
   * Update prompt templates
   */
  updateTemplates(updates: Partial<PromptTemplate>): void {
    this.templates = {
      ...this.templates,
      ...updates,
      strategySpecific: {
        ...this.templates.strategySpecific,
        ...updates.strategySpecific
      },
      contextEnhancements: {
        ...this.templates.contextEnhancements,
        ...updates.contextEnhancements
      }
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): SystemPromptBuilderConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SystemPromptBuilderConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get default prompt templates
   */
  private getDefaultTemplates(): PromptTemplate {
    return {
      base: `You are an AI assistant participating in a dynamic multi-AI conversation. Your role is to contribute meaningfully to the discussion while maintaining your unique perspective and personality.

Guidelines:
- Be conversational and engaging
- Respond naturally to other participants
- Maintain context awareness
- Show genuine interest in the discussion
- Avoid being overly formal or robotic`,

      strategySpecific: {
        'agree-expand': `For this response, focus on agreeing with valid points and expanding the discussion with additional insights, examples, or related perspectives.`,

        'challenge': `For this response, respectfully challenge assumptions or present alternative viewpoints. Ask probing questions and encourage deeper thinking about the topic.`,

        'redirect': `For this response, help guide the conversation toward new but related topics. Use natural transitions to introduce fresh perspectives or areas of discussion.`,

        'question': `For this response, focus on asking thoughtful questions that deepen the conversation. Show curiosity and help uncover new aspects of the topic.`,

        'direct': `For this response, provide a clear, direct answer or reaction to what was said. Be concise but informative.`,

        'support': `For this response, build upon and reinforce good points made by others. Show agreement and add supporting evidence or examples.`,

        'analyze': `For this response, break down complex topics into components. Provide analytical insights and examine different aspects of the discussion.`
      },

      contextEnhancements: {
        topicChange: `The conversation is shifting from {{PREVIOUS_TOPIC}} to {{NEW_TOPIC}}. Help facilitate this transition naturally.`,

        comment: `Someone mentioned: "{{COMMENT}}" - consider how this relates to your response.`,

        agreement: `There seems to be consensus forming. Consider how to build on this agreement constructively.`,

        challenge: `Different viewpoints are emerging. Consider how to contribute to a respectful debate.`
      }
    };
  }

  /**
   * Build participant-specific information section
   */
  private buildParticipantSection(participant: AIParticipant, context: PromptContext): string {
    const sections = [];

    sections.push(`\nParticipant Information:`);
    sections.push(`- Your identity: ${participant.alias || participant.id}`);
    sections.push(`- Provider: ${participant.provider.name}`);

    if (context.participantCount > 1) {
      sections.push(`- Other participants: ${context.participantCount - 1} other AI(s) in conversation`);
    }

    return sections.join('\n');
  }

  /**
   * Build strategy-specific section
   */
  private buildStrategySection(strategy: InteractionStrategy): string {
    const strategyPrompt = this.templates.strategySpecific[strategy];
    if (!strategyPrompt) {
      return '';
    }

    return `\nStrategy Guidance:\n${strategyPrompt}`;
  }

  /**
   * Build context section from recent messages
   */
  private buildContextSection(recentContext: string): string {
    if (!recentContext.trim()) {
      return '';
    }

    const truncatedContext = this.truncateContext(recentContext, 500);
    return `\nRecent Context:\n${truncatedContext}`;
  }

  /**
   * Build metadata section with conversation info
   */
  private buildMetadataSection(context: PromptContext): string {
    const metadata = [];

    if (context.conversationTopic) {
      metadata.push(`Current topic: ${context.conversationTopic}`);
    }

    if (context.userIntent) {
      metadata.push(`User intent: ${context.userIntent}`);
    }

    if (context.emotionalTone) {
      metadata.push(`Conversation tone: ${context.emotionalTone}`);
    }

    if (metadata.length === 0) {
      return '';
    }

    return `\nConversation Metadata:\n- ${metadata.join('\n- ')}`;
  }

  /**
   * Truncate context to fit within limits
   */
  private truncateContext(context: string, maxLength: number): string {
    if (context.length <= maxLength) {
      return context;
    }

    // Truncate and add ellipsis
    return context.substring(0, maxLength - 3).trim() + '...';
  }

  /**
   * Truncate entire prompt to maximum length
   */
  private truncatePrompt(prompt: string, maxLength: number): string {
    if (prompt.length <= maxLength) {
      return prompt;
    }

    // Find a good truncation point (preferably end of a section)
    const sections = prompt.split('\n\n');
    let truncated = '';

    for (const section of sections) {
      const potential = truncated + (truncated ? '\n\n' : '') + section;
      if (potential.length > maxLength - 100) { // Leave some buffer
        break;
      }
      truncated = potential;
    }

    if (truncated.length === 0) {
      // Fallback: just truncate at character limit
      truncated = prompt.substring(0, maxLength - 50);
    }

    truncated += '\n\n[Prompt truncated due to length limits]';
    return truncated;
  }

  /**
   * Extract topic from recent context
   */
  extractTopic(context: string): string | undefined {
    // Simple topic extraction - in practice, you might want more sophisticated NLP
    const sentences = context.split(/[.!?]+/);
    const lastSentence = sentences[sentences.length - 1]?.trim();

    if (lastSentence && lastSentence.length > 10) {
      return lastSentence.substring(0, 100);
    }

    return undefined;
  }

  /**
   * Detect emotional tone from context
   */
  detectEmotionalTone(context: string): string {
    const positiveWords = ['great', 'excellent', 'amazing', 'wonderful', 'fantastic'];
    const negativeWords = ['terrible', 'awful', 'bad', 'horrible', 'disappointing'];
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'which'];

    const lowerContext = context.toLowerCase();

    const positiveCount = positiveWords.filter(word => lowerContext.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerContext.includes(word)).length;
    const questionCount = questionWords.filter(word => lowerContext.includes(word)).length;

    if (questionCount > 2) return 'inquisitive';
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'critical';
    return 'neutral';
  }
}