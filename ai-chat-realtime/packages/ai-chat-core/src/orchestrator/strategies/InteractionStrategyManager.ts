/**
 * Interaction Strategy Manager
 *
 * Handles the logic for determining and applying AI interaction strategies.
 * Extracted from ChatOrchestrator for better modularity and testability.
 */

import {
  IInteractionStrategyManager,
  InteractionStrategy,
  InteractionStrategyConfig,
  StrategyWeight,
  StrategyContext,
  StrategyDecision,
  StrategyError,
  AIParticipant
} from '../../types/orchestrator.js';
import { Message } from '../../types/index.js';

export class InteractionStrategyManager implements IInteractionStrategyManager {
  private strategies: Map<InteractionStrategy, InteractionStrategyConfig> = new Map();
  private strategyWeights: Record<InteractionStrategy, number>;

  constructor() {
    this.initializeDefaultStrategies();
    this.strategyWeights = this.getDefaultWeights();
  }

  /**
   * Initialize default interaction strategies
   */
  private initializeDefaultStrategies(): void {
    const defaultStrategies: InteractionStrategyConfig[] = [
      {
        type: 'agree-expand',
        weight: 0.3,
        description: 'Agree with the previous message and expand on the topic',
        triggers: ['agreement', 'expansion', 'building'],
        constraints: {
          maxConsecutive: 3,
          cooldownMs: 5000
        }
      },
      {
        type: 'challenge',
        weight: 0.25,
        description: 'Challenge or debate the previous point',
        triggers: ['disagreement', 'debate', 'counterpoint'],
        constraints: {
          maxConsecutive: 2,
          cooldownMs: 10000
        }
      },
      {
        type: 'redirect',
        weight: 0.15,
        description: 'Redirect the conversation to a new topic',
        triggers: ['topic_change', 'new_direction'],
        constraints: {
          maxConsecutive: 1,
          cooldownMs: 15000
        }
      },
      {
        type: 'question',
        weight: 0.2,
        description: 'Ask a question to continue the conversation',
        triggers: ['inquiry', 'curiosity'],
        constraints: {
          maxConsecutive: 2,
          cooldownMs: 8000
        }
      },
      {
        type: 'direct',
        weight: 0.1,
        description: 'Provide a direct response without embellishment',
        triggers: ['mention', 'direct_address'],
        constraints: {
          maxConsecutive: 5,
          cooldownMs: 0
        }
      },
      {
        type: 'support',
        weight: 0.15,
        description: 'Support another participant\'s point',
        triggers: ['support', 'agreement', 'collaboration']
      },
      {
        type: 'analyze',
        weight: 0.1,
        description: 'Analyze or break down the current topic',
        triggers: ['analysis', 'breakdown', 'examination']
      }
    ];

    defaultStrategies.forEach(strategy => {
      this.strategies.set(strategy.type, strategy);
    });
  }

  /**
   * Get default strategy weights
   */
  private getDefaultWeights(): Record<InteractionStrategy, number> {
    return {
      'agree-expand': 0.3,
      'challenge': 0.25,
      'redirect': 0.15,
      'question': 0.2,
      'direct': 0.1,
      'support': 0.15,
      'analyze': 0.1
    };
  }

  /**
   * Determine the best interaction strategy based on context
   */
  determineStrategy(context: StrategyContext): StrategyDecision {
    try {
      const weights = this.getStrategyWeights(context);
      const selectedStrategy = this.selectStrategyByWeight(weights);

      return {
        selectedStrategy: selectedStrategy.strategy,
        confidence: this.calculateConfidence(weights, selectedStrategy.strategy),
        weights,
        reasoning: this.generateReasoning(context, selectedStrategy.strategy, weights)
      };
    } catch (error) {
      throw new StrategyError(
        `Failed to determine interaction strategy: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        context
      );
    }
  }

  /**
   * Apply the selected strategy to modify context or behavior
   */
  applyStrategy(strategy: InteractionStrategy, context: StrategyContext): Record<string, unknown> {
    const strategyConfig = this.strategies.get(strategy);
    if (!strategyConfig) {
      throw new StrategyError(`Unknown strategy: ${strategy}`, strategy, context);
    }

    const adjustments: Record<string, unknown> = {
      strategy,
      adjustedContext: this.adjustContextForStrategy(context, strategy),
      promptAdjustments: this.getPromptAdjustmentsForStrategy(strategy),
      behavioralHints: this.getBehavioralHintsForStrategy(strategy)
    };

    return adjustments;
  }

  /**
   * Calculate strategy weights based on context
   */
  getStrategyWeights(context: StrategyContext): StrategyWeight[] {
    const baseWeights = { ...this.strategyWeights };
    const recentMessages = context.recentMessages.slice(-5);
    const aiMessages = recentMessages.filter(msg => msg.role === 'assistant');
    const lastMessage = recentMessages[recentMessages.length - 1];

    // Adjust weights based on recent AI activity
    if (lastMessage?.role === 'assistant' && aiMessages.length > 0) {
      baseWeights.challenge += 0.1;
      baseWeights['agree-expand'] += 0.05;
    }

    // Reduce repetitive strategies
    if (context.lastStrategyUsed) {
      baseWeights[context.lastStrategyUsed] *= 0.7;
    }

    // Increase redirect weight if many AI messages
    if (aiMessages.length >= 3) {
      baseWeights.redirect += 0.15;
      baseWeights.question += 0.1;
    }

    // Increase direct response weight for mentions
    const mentionDetected = this.detectMentions(context);
    if (mentionDetected) {
      baseWeights.direct += 0.4;
      baseWeights.challenge += 0.1;
    }

    // Adjust for silence duration
    if (context.silenceDurationMs > 30000) {
      baseWeights.question += 0.2;
      baseWeights.redirect += 0.1;
    }

    // Convert to array format with reasons
    return Object.entries(baseWeights).map(([strategy, weight]) => ({
      strategy: strategy as InteractionStrategy,
      weight,
      reason: this.getWeightReason(strategy as InteractionStrategy, context)
    }));
  }

  /**
   * Register a new strategy or update existing one
   */
  registerStrategy(config: InteractionStrategyConfig): void {
    this.strategies.set(config.type, config);
    this.strategyWeights[config.type] = config.weight;
  }

  /**
   * Update strategy weights
   */
  updateStrategyWeights(updates: Partial<Record<InteractionStrategy, number>>): void {
    Object.entries(updates).forEach(([strategy, weight]) => {
      if (weight !== undefined) {
        this.strategyWeights[strategy as InteractionStrategy] = weight;
      }
    });
  }

  /**
   * Select strategy based on weighted random selection
   */
  private selectStrategyByWeight(weights: StrategyWeight[]): StrategyWeight {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    if (totalWeight <= 0) {
      // Fallback to direct strategy
      return { strategy: 'direct', weight: 1, reason: 'fallback' };
    }

    const randomValue = Math.random() * totalWeight;
    let cumulativeWeight = 0;

    for (const weight of weights) {
      cumulativeWeight += weight.weight;
      if (randomValue <= cumulativeWeight) {
        return weight;
      }
    }

    // Fallback to last strategy if somehow we didn't select one
    return weights[weights.length - 1];
  }

  /**
   * Calculate confidence score for the selected strategy
   */
  private calculateConfidence(weights: StrategyWeight[], selectedStrategy: InteractionStrategy): number {
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    const selectedWeight = weights.find(w => w.strategy === selectedStrategy)?.weight || 0;

    if (totalWeight <= 0) return 0;
    return Math.min(selectedWeight / totalWeight, 1);
  }

  /**
   * Generate human-readable reasoning for strategy selection
   */
  private generateReasoning(
    context: StrategyContext,
    strategy: InteractionStrategy,
    weights: StrategyWeight[]
  ): string {
    const selectedWeight = weights.find(w => w.strategy === strategy);
    const reasons = [];

    if (selectedWeight?.reason) {
      reasons.push(selectedWeight.reason);
    }

    if (context.messageCount > 10) {
      reasons.push('extended conversation context');
    }

    if (context.silenceDurationMs > 30000) {
      reasons.push('long silence detected');
    }

    if (context.aiParticipants.length > 2) {
      reasons.push('multiple participants present');
    }

    const strategyConfig = this.strategies.get(strategy);
    if (strategyConfig) {
      reasons.push(strategyConfig.description.toLowerCase());
    }

    return reasons.length > 0
      ? `Selected ${strategy} strategy due to: ${reasons.join(', ')}`
      : `Selected ${strategy} strategy`;
  }

  /**
   * Adjust context based on selected strategy
   */
  private adjustContextForStrategy(context: StrategyContext, strategy: InteractionStrategy): StrategyContext {
    const adjustedContext = { ...context };

    switch (strategy) {
      case 'challenge':
        // For challenge strategy, emphasize recent disagreements or different viewpoints
        break;
      case 'redirect':
        // For redirect strategy, de-emphasize current topic
        break;
      case 'question':
        // For question strategy, emphasize areas needing clarification
        break;
      // Add other strategy-specific adjustments
    }

    return adjustedContext;
  }

  /**
   * Get prompt adjustments for specific strategy
   */
  private getPromptAdjustmentsForStrategy(strategy: InteractionStrategy): Record<string, unknown> {
    const adjustments: Record<string, unknown> = {};

    switch (strategy) {
      case 'agree-expand':
        adjustments.tone = 'supportive';
        adjustments.focus = 'expansion';
        break;
      case 'challenge':
        adjustments.tone = 'questioning';
        adjustments.focus = 'counterpoint';
        break;
      case 'redirect':
        adjustments.tone = 'transitional';
        adjustments.focus = 'new_topic';
        break;
      case 'question':
        adjustments.tone = 'curious';
        adjustments.focus = 'inquiry';
        break;
      case 'direct':
        adjustments.tone = 'clear';
        adjustments.focus = 'direct_answer';
        break;
      case 'support':
        adjustments.tone = 'collaborative';
        adjustments.focus = 'reinforcement';
        break;
      case 'analyze':
        adjustments.tone = 'analytical';
        adjustments.focus = 'breakdown';
        break;
    }

    return adjustments;
  }

  /**
   * Get behavioral hints for strategy
   */
  private getBehavioralHintsForStrategy(strategy: InteractionStrategy): string[] {
    const hints: Record<InteractionStrategy, string[]> = {
      'agree-expand': ['build upon previous points', 'add supporting evidence'],
      'challenge': ['present alternative viewpoints', 'ask probing questions'],
      'redirect': ['introduce new topics', 'bridge to related subjects'],
      'question': ['ask for clarification', 'seek deeper understanding'],
      'direct': ['provide clear answers', 'be concise and factual'],
      'support': ['reinforce good points', 'show agreement'],
      'analyze': ['break down complex topics', 'examine details']
    };

    return hints[strategy] || [];
  }

  /**
   * Get reason for weight adjustment
   */
  private getWeightReason(strategy: InteractionStrategy, context: StrategyContext): string {
    const reasons = [];

    if (context.lastStrategyUsed === strategy) {
      reasons.push('reduced for variety');
    }

    if (strategy === 'direct' && this.detectMentions(context)) {
      reasons.push('increased for mention');
    }

    if (strategy === 'redirect' && context.recentMessages.filter(m => m.role === 'assistant').length >= 3) {
      reasons.push('increased for topic diversity');
    }

    return reasons.length > 0 ? reasons.join(', ') : 'base weight';
  }

  /**
   * Simple mention detection
   */
  private detectMentions(context: StrategyContext): boolean {
    const lastMessage = context.recentMessages[context.recentMessages.length - 1];
    if (!lastMessage) return false;

    // Simple check for @ mentions or participant names
    const content = lastMessage.content.toLowerCase();
    return context.aiParticipants.some(participant => {
      const alias = participant.alias?.toLowerCase() || participant.id.toLowerCase();
      return content.includes(`@${alias}`) || content.includes(alias);
    });
  }
}