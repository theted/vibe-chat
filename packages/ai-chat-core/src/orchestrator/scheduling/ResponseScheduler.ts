/**
 * Response Scheduler
 *
 * Handles the scheduling and timing of AI responses in conversations.
 * Extracted from ChatOrchestrator for better modularity and testability.
 */

import {
  IResponseScheduler,
  ResponseSchedule,
  SchedulingConfig,
  SchedulingContext,
  SchedulingError,
  AIParticipant,
  InteractionStrategy,
  MentionContext
} from '@/types/orchestrator.js';
import { Message } from '@/types/index.js';

export class ResponseScheduler implements IResponseScheduler {
  private config: SchedulingConfig;
  private activeSchedules: Map<string, NodeJS.Timeout> = new Map();
  private responseQueue: ResponseSchedule[] = [];

  constructor(config?: Partial<SchedulingConfig>) {
    this.config = {
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      minDelayMs: 300,
      variabilityFactor: 0.3,
      priorityWeight: 0.5,
      enableStaggering: true,
      ...config
    };
  }

  /**
   * Schedule responses for multiple participants
   */
  scheduleResponses(
    participants: AIParticipant[],
    strategy: InteractionStrategy,
    context: SchedulingContext
  ): ResponseSchedule[] {
    try {
      const schedules: ResponseSchedule[] = [];

      // Filter active participants
      const activeParticipants = participants.filter(p => p.isActive && !p.isSleeping);

      if (activeParticipants.length === 0) {
        return schedules;
      }

      // Create schedules for each participant
      activeParticipants.forEach((participant, index) => {
        const delay = this.calculateResponseDelay(
          participant,
          index,
          activeParticipants.length,
          context
        );

        const priority = this.calculatePriority(participant, strategy, context);

        const schedule: ResponseSchedule = {
          participant,
          delayMs: delay,
          priority,
          strategy,
          context: {
            position: index,
            total: activeParticipants.length,
            scheduledAt: Date.now()
          }
        };

        schedules.push(schedule);
      });

      // Sort by priority and adjust delays if staggering is enabled
      const sortedSchedules = schedules.sort((a, b) => b.priority - a.priority);

      if (this.config.enableStaggering && sortedSchedules.length > 1) {
        this.applyStaggering(sortedSchedules);
      }

      return sortedSchedules;

    } catch (error) {
      throw new SchedulingError(
        `Failed to schedule responses: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        participants
      );
    }
  }

  /**
   * Select which AIs should respond based on mentions and strategy
   */
  selectRespondingAIs(
    participants: AIParticipant[],
    mentions: MentionContext,
    strategy: InteractionStrategy
  ): AIParticipant[] {
    const respondingAIs: AIParticipant[] = [];

    // Always include explicitly mentioned AIs
    mentions.explicitTargets.forEach(target => {
      if (target.isActive && !target.isSleeping && !respondingAIs.includes(target)) {
        respondingAIs.push(target);
      }
    });

    // Add implicitly mentioned AIs with lower probability
    mentions.implicitTargets.forEach(target => {
      if (
        target.isActive &&
        !target.isSleeping &&
        !respondingAIs.includes(target) &&
        Math.random() < 0.6
      ) {
        respondingAIs.push(target);
      }
    });

    // Select additional responders based on strategy
    const remainingParticipants = participants.filter(
      p => p.isActive && !p.isSleeping && !respondingAIs.includes(p)
    );

    const additionalResponders = this.selectAdditionalResponders(
      remainingParticipants,
      strategy,
      respondingAIs.length
    );

    return [...respondingAIs, ...additionalResponders];
  }

  /**
   * Calculate response delay for a specific participant
   */
  calculateResponseDelay(
    participant: AIParticipant,
    position: number,
    total: number,
    context: SchedulingContext
  ): number {
    let baseDelay = this.config.baseDelayMs;

    // Adjust based on participant history
    const timeSinceLastResponse = Date.now() - (participant.lastResponseTime || 0);
    if (timeSinceLastResponse < 5000) {
      baseDelay *= 1.5; // Slow down frequent responders
    }

    // Adjust based on position (staggering)
    if (this.config.enableStaggering && total > 1) {
      const staggerDelay = (position * 1000) + (Math.random() * 500);
      baseDelay += staggerDelay;
    }

    // Add variability
    const variability = this.config.variabilityFactor;
    const randomFactor = 1 + ((Math.random() - 0.5) * 2 * variability);
    baseDelay *= randomFactor;

    // Adjust based on typing awareness
    if (context.typingAwareDelays) {
      baseDelay += this.calculateTypingDelay(baseDelay);
    }

    // Ensure within bounds
    return Math.max(
      this.config.minDelayMs,
      Math.min(baseDelay, this.config.maxDelayMs)
    );
  }

  /**
   * Execute a schedule by setting up timers
   */
  async executeSchedule(schedule: ResponseSchedule[]): Promise<void> {
    try {
      const promises = schedule.map(item => this.executeScheduleItem(item));
      await Promise.all(promises);
    } catch (error) {
      throw new SchedulingError(
        `Failed to execute schedule: ${error instanceof Error ? error.message : String(error)}`,
        schedule
      );
    }
  }

  /**
   * Cancel all scheduled responses
   */
  cancelAllSchedules(): void {
    this.activeSchedules.forEach(timeout => {
      clearTimeout(timeout);
    });
    this.activeSchedules.clear();
    this.responseQueue = [];
  }

  /**
   * Cancel schedule for specific participant
   */
  cancelScheduleForParticipant(participantId: string): void {
    const timeout = this.activeSchedules.get(participantId);
    if (timeout) {
      clearTimeout(timeout);
      this.activeSchedules.delete(participantId);
    }

    // Remove from queue
    this.responseQueue = this.responseQueue.filter(
      item => item.participant.id !== participantId
    );
  }

  /**
   * Get current scheduling status
   */
  getSchedulingStatus(): {
    activeCount: number;
    queuedCount: number;
    nextScheduled?: number;
  } {
    const nextScheduled = this.responseQueue.length > 0
      ? Math.min(...this.responseQueue.map(item =>
          ((item.context?.scheduledAt as number) || 0) + item.delayMs
        ))
      : undefined;

    return {
      activeCount: this.activeSchedules.size,
      queuedCount: this.responseQueue.length,
      nextScheduled
    };
  }

  /**
   * Update scheduling configuration
   */
  updateConfig(config: Partial<SchedulingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Execute a single schedule item
   */
  private async executeScheduleItem(item: ResponseSchedule): Promise<void> {
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.activeSchedules.delete(item.participant.id);

        // Emit event or call callback here
        // In practice, this would trigger the actual response generation
        this.onScheduledResponseReady(item);

        resolve();
      }, item.delayMs);

      this.activeSchedules.set(item.participant.id, timeout);
    });
  }

  /**
   * Handle when a scheduled response is ready
   */
  private onScheduledResponseReady(schedule: ResponseSchedule): void {
    // This would be implemented by the orchestrator
    // For now, just update the participant's last response time
    schedule.participant.lastResponseTime = Date.now();

    // Remove from queue
    this.responseQueue = this.responseQueue.filter(
      item => item.participant.id !== schedule.participant.id
    );
  }

  /**
   * Calculate priority for a participant's response
   */
  private calculatePriority(
    participant: AIParticipant,
    strategy: InteractionStrategy,
    context: SchedulingContext
  ): number {
    let priority = 0.5; // Base priority

    // Increase priority for recently active participants
    const timeSinceLastResponse = Date.now() - (participant.lastResponseTime || 0);
    if (timeSinceLastResponse > 30000) {
      priority += 0.2; // Boost inactive participants
    }

    // Adjust based on strategy
    switch (strategy) {
      case 'direct':
        priority += 0.3;
        break;
      case 'challenge':
        priority += 0.1;
        break;
      case 'question':
        priority += 0.2;
        break;
    }

    // Adjust based on mention
    // This would need to be passed in via context
    // priority += mentionBoost;

    return Math.max(0, Math.min(1, priority));
  }

  /**
   * Select additional responders based on strategy
   */
  private selectAdditionalResponders(
    availableParticipants: AIParticipant[],
    strategy: InteractionStrategy,
    alreadySelectedCount: number
  ): AIParticipant[] {
    const additional: AIParticipant[] = [];

    // Determine how many additional responders based on strategy
    let targetCount = 1;
    switch (strategy) {
      case 'challenge':
        targetCount = 2; // Encourage debate
        break;
      case 'question':
        targetCount = Math.min(2, availableParticipants.length);
        break;
      case 'redirect':
        targetCount = 1;
        break;
      default:
        targetCount = 1;
    }

    // Don't exceed total available or add too many
    const maxToAdd = Math.min(
      targetCount,
      availableParticipants.length,
      3 - alreadySelectedCount
    );

    // Select randomly from available participants
    const shuffled = [...availableParticipants].sort(() => Math.random() - 0.5);
    additional.push(...shuffled.slice(0, maxToAdd));

    return additional;
  }

  /**
   * Apply staggering to prevent simultaneous responses
   */
  private applyStaggering(schedules: ResponseSchedule[]): void {
    const baseStagger = 1200; // Base time between responses
    let cumulativeDelay = 0;

    schedules.forEach((schedule, index) => {
      if (index > 0) {
        cumulativeDelay += baseStagger + (Math.random() * 800);
        schedule.delayMs += cumulativeDelay;
      }
    });
  }

  /**
   * Calculate typing-aware delays to simulate realistic response times
   */
  private calculateTypingDelay(baseDelay: number): number {
    // Simulate typing time based on estimated response length
    // This is a simplified calculation
    const estimatedResponseLength = 50 + (Math.random() * 100); // chars
    const typingSpeed = 3; // chars per second (slower for AI realism)
    const typingDelay = (estimatedResponseLength / typingSpeed) * 1000;

    return Math.min(typingDelay, baseDelay * 0.5);
  }

  /**
   * Get metrics about scheduling performance
   */
  getSchedulingMetrics(): Record<string, unknown> {
    return {
      config: this.config,
      activeSchedules: this.activeSchedules.size,
      queueLength: this.responseQueue.length,
      averageDelay: this.responseQueue.length > 0
        ? this.responseQueue.reduce((sum, item) => sum + item.delayMs, 0) / this.responseQueue.length
        : 0
    };
  }
}