/**
 * Mention Handler
 *
 * Handles detection, parsing, and processing of @mentions in conversations.
 * Extracted from ChatOrchestrator for better modularity.
 */

import {
  IMentionHandler,
  MentionData,
  MentionContext,
  AIParticipant,
  ParticipantError
} from '@/types/orchestrator.js';
import { Message } from '@/types/index.js';

export class MentionHandler implements IMentionHandler {
  private mentionRegex = /@([a-zA-Z0-9\-_]+)/g;
  private aliasNormalizationCache = new Map<string, string>();

  /**
   * Detect mentions in a message and return context
   */
  detectMentions(message: Message, participants: AIParticipant[]): MentionContext {
    const mentions: MentionData[] = [];
    const explicitTargets: AIParticipant[] = [];
    const implicitTargets: AIParticipant[] = [];

    // Find explicit @mentions
    const explicitMentions = this.findExplicitMentions(message.content);
    for (const mention of explicitMentions) {
      const targetAI = this.findAIByAlias(mention.alias, participants);
      if (targetAI) {
        const mentionData: MentionData = {
          type: 'direct',
          targetAI,
          originalText: mention.originalText,
          normalizedTarget: mention.normalizedAlias,
          confidence: 0.9
        };
        mentions.push(mentionData);
        explicitTargets.push(targetAI);
      }
    }

    // Find implicit mentions (name references without @)
    const implicitMentions = this.findImplicitMentions(message.content, participants);
    for (const mention of implicitMentions) {
      if (!explicitTargets.includes(mention.targetAI)) {
        mentions.push(mention);
        implicitTargets.push(mention.targetAI);
      }
    }

    // Detect contextual mentions (references to previous messages)
    const contextualMentions = this.findContextualMentions(message, participants);
    for (const mention of contextualMentions) {
      if (!explicitTargets.includes(mention.targetAI) && !implicitTargets.includes(mention.targetAI)) {
        mentions.push(mention);
      }
    }

    return {
      message,
      mentions,
      explicitTargets,
      implicitTargets
    };
  }

  /**
   * Find AI participant by alias (normalized matching)
   */
  findAIByAlias(alias: string, participants: AIParticipant[]): AIParticipant | undefined {
    const normalizedAlias = this.normalizeAlias(alias);

    return participants.find(participant => {
      const participantAliases = [
        participant.alias,
        participant.id,
        participant.provider?.name
      ].filter(Boolean);

      return participantAliases.some(candidateAlias =>
        this.normalizeAlias(candidateAlias!) === normalizedAlias
      );
    });
  }

  /**
   * Normalize alias for consistent matching
   */
  normalizeAlias(alias: string): string {
    if (this.aliasNormalizationCache.has(alias)) {
      return this.aliasNormalizationCache.get(alias)!;
    }

    const normalized = alias
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();

    this.aliasNormalizationCache.set(alias, normalized);
    return normalized;
  }

  /**
   * Add mention token to response
   */
  addMentionToResponse(response: string, targetAI: AIParticipant): string {
    const mentionToken = this.getMentionTokenForAI(targetAI);

    // Add mention at the beginning if not already present
    if (!response.includes(mentionToken)) {
      return `${mentionToken} ${response}`;
    }

    return response;
  }

  /**
   * Get mention token for an AI participant
   */
  getMentionTokenForAI(ai: AIParticipant): string {
    const alias = ai.alias || ai.id;
    return `@${this.toMentionAlias(alias)}`;
  }

  /**
   * Find explicit @mentions in text
   */
  private findExplicitMentions(content: string): Array<{
    originalText: string;
    alias: string;
    normalizedAlias: string;
  }> {
    const mentions: Array<{
      originalText: string;
      alias: string;
      normalizedAlias: string;
    }> = [];

    let match;
    this.mentionRegex.lastIndex = 0; // Reset regex state

    while ((match = this.mentionRegex.exec(content)) !== null) {
      const originalText = match[0];
      const alias = match[1];
      const normalizedAlias = this.normalizeAlias(alias);

      mentions.push({
        originalText,
        alias,
        normalizedAlias
      });
    }

    return mentions;
  }

  /**
   * Find implicit mentions (name references without @)
   */
  private findImplicitMentions(content: string, participants: AIParticipant[]): MentionData[] {
    const mentions: MentionData[] = [];
    const contentLower = content.toLowerCase();

    for (const participant of participants) {
      const aliases = [
        participant.alias,
        participant.id,
        participant.provider?.name
      ].filter(Boolean);

      for (const alias of aliases) {
        if (!alias) continue;

        const aliasLower = alias.toLowerCase();
        const index = contentLower.indexOf(aliasLower);

        if (index !== -1) {
          // Check if it's a whole word match
          const beforeChar = index > 0 ? contentLower[index - 1] : ' ';
          const afterChar = index + aliasLower.length < contentLower.length
            ? contentLower[index + aliasLower.length]
            : ' ';

          if (this.isWordBoundary(beforeChar) && this.isWordBoundary(afterChar)) {
            mentions.push({
              type: 'indirect',
              targetAI: participant,
              originalText: alias,
              normalizedTarget: this.normalizeAlias(alias),
              confidence: 0.7
            });
            break; // Only count once per participant
          }
        }
      }
    }

    return mentions;
  }

  /**
   * Find contextual mentions (references to previous messages or context)
   */
  private findContextualMentions(message: Message, participants: AIParticipant[]): MentionData[] {
    const mentions: MentionData[] = [];
    const content = message.content.toLowerCase();

    // Look for contextual phrases that might indicate references
    const contextualPhrases = [
      'what you said',
      'your point',
      'your opinion',
      'you mentioned',
      'as you said',
      'i agree with you',
      'you\'re right',
      'you think'
    ];

    for (const phrase of contextualPhrases) {
      if (content.includes(phrase)) {
        // Try to determine which participant this might refer to
        // This is a simple heuristic - in practice, you'd want more sophisticated analysis
        if (participants.length > 0) {
          mentions.push({
            type: 'context',
            targetAI: participants[0], // Simplified - would need better logic
            originalText: phrase,
            normalizedTarget: phrase,
            confidence: 0.4
          });
        }
      }
    }

    return mentions;
  }

  /**
   * Check if character is a word boundary
   */
  private isWordBoundary(char: string): boolean {
    return /[\s\W]/.test(char);
  }

  /**
   * Convert alias to mention format
   */
  private toMentionAlias(value: string, fallback: string = ''): string {
    const base = value && value.trim() ? value : fallback;
    if (!base) return '';

    return base
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Extract mention metadata for advanced processing
   */
  extractMentionMetadata(mentions: MentionData[]): Record<string, unknown> {
    const metadata = {
      totalMentions: mentions.length,
      directMentions: mentions.filter(m => m.type === 'direct').length,
      indirectMentions: mentions.filter(m => m.type === 'indirect').length,
      contextualMentions: mentions.filter(m => m.type === 'context').length,
      averageConfidence: mentions.length > 0
        ? mentions.reduce((sum, m) => sum + m.confidence, 0) / mentions.length
        : 0,
      mentionedParticipants: [...new Set(mentions.map(m => m.targetAI?.id).filter(Boolean))]
    };

    return metadata;
  }

  /**
   * Validate mention data
   */
  validateMentionData(mention: MentionData): boolean {
    if (!mention.originalText || !mention.normalizedTarget) {
      return false;
    }

    if (mention.confidence < 0 || mention.confidence > 1) {
      return false;
    }

    if (!['direct', 'indirect', 'context'].includes(mention.type)) {
      return false;
    }

    return true;
  }

  /**
   * Clear normalization cache to prevent memory leaks
   */
  clearCache(): void {
    this.aliasNormalizationCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.aliasNormalizationCache.size,
      maxSize: 1000 // Could be configurable
    };
  }

  /**
   * Trim cache if it gets too large
   */
  private trimCache(): void {
    const maxSize = 1000;
    if (this.aliasNormalizationCache.size > maxSize) {
      const entries = Array.from(this.aliasNormalizationCache.entries());
      const toKeep = entries.slice(-maxSize / 2); // Keep most recent half

      this.aliasNormalizationCache.clear();
      toKeep.forEach(([key, value]) => {
        this.aliasNormalizationCache.set(key, value);
      });
    }
  }
}