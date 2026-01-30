/**
 * Background Conversation Manager
 *
 * Manages background AI conversations during periods of user silence.
 * Extracted from ChatOrchestrator for better modularity and testability.
 */

import {
  IBackgroundConversationManager,
  BackgroundConversationConfig,
  BackgroundConversationState,
  AIParticipant,
  SchedulingError
} from '@/types/orchestrator.js';

export class BackgroundConversationManager implements IBackgroundConversationManager {
  private config: BackgroundConversationConfig;
  private state: BackgroundConversationState;
  private participants: AIParticipant[] = [];

  constructor(config?: Partial<BackgroundConversationConfig>) {
    this.config = {
      enabled: true,
      triggerSilenceMs: 30000, // 30 seconds
      participantRotationMs: 45000, // 45 seconds
      maxBackgroundMessages: 10,
      sleepAfterMessages: 5,
      wakeUpProbability: 0.3,
      ...config
    };

    this.state = {
      isActive: false,
      sleepingParticipants: new Set(),
      messagesSinceUserInput: 0
    };
  }

  /**
   * Start background conversation monitoring
   */
  start(participants: AIParticipant[]): void {
    if (!this.config.enabled) {
      return;
    }

    this.participants = participants.filter(p => p.isActive);

    if (this.participants.length < 2) {
      // Need at least 2 participants for meaningful conversation
      return;
    }

    this.state.isActive = true;
    this.state.lastTriggerTime = Date.now();

    this.scheduleNextCheck();
  }

  /**
   * Stop background conversation
   */
  stop(): void {
    this.state.isActive = false;

    if (this.state.activeTimer) {
      clearTimeout(this.state.activeTimer);
      this.state.activeTimer = undefined;
    }

    // Wake up all sleeping participants
    this.wakeUpParticipants();
  }

  /**
   * Handle silence periods and potentially trigger background conversations
   */
  handleSilence(silenceDurationMs: number): void {
    if (!this.config.enabled || !this.state.isActive) {
      return;
    }

    if (this.shouldTriggerBackground(silenceDurationMs)) {
      this.triggerBackgroundActivity();
    }
  }

  /**
   * Put participants to sleep after too much activity
   */
  putParticipantsToSleep(participants: AIParticipant[]): void {
    participants.forEach(participant => {
      if (participant.messageCount >= this.config.sleepAfterMessages) {
        this.state.sleepingParticipants.add(participant.id);
        participant.isSleeping = true;

        // Schedule wake up
        this.scheduleWakeUp(participant);
      }
    });
  }

  /**
   * Wake up sleeping participants
   */
  wakeUpParticipants(participants?: AIParticipant[]): void {
    const toWakeUp = participants || this.participants;

    toWakeUp.forEach(participant => {
      if (this.state.sleepingParticipants.has(participant.id)) {
        // Random chance to wake up, or force wake up if specified
        if (!participants || Math.random() < this.config.wakeUpProbability) {
          this.state.sleepingParticipants.delete(participant.id);
          participant.isSleeping = false;
          participant.messageCount = 0; // Reset message count
        }
      }
    });
  }

  /**
   * Check if background conversation should be triggered
   */
  shouldTriggerBackground(silenceDurationMs: number): boolean {
    if (!this.config.enabled || !this.state.isActive) {
      return false;
    }

    // Check if enough time has passed
    if (silenceDurationMs < this.config.triggerSilenceMs) {
      return false;
    }

    // Check if we haven't exceeded max background messages
    if (this.state.messagesSinceUserInput >= this.config.maxBackgroundMessages) {
      return false;
    }

    // Check if we have awake participants
    const awakeParticipants = this.getAwakeParticipants();
    if (awakeParticipants.length < 2) {
      // Try to wake up some participants
      this.wakeUpParticipants();
      return this.getAwakeParticipants().length >= 2;
    }

    return true;
  }

  /**
   * Get current background conversation state
   */
  getState(): BackgroundConversationState {
    return {
      ...this.state,
      sleepingParticipants: new Set(this.state.sleepingParticipants)
    };
  }

  /**
   * Update background conversation configuration
   */
  updateConfig(updates: Partial<BackgroundConversationConfig>): void {
    this.config = { ...this.config, ...updates };

    // If disabled, stop current activity
    if (!this.config.enabled && this.state.isActive) {
      this.stop();
    }
  }

  /**
   * Get background conversation metrics
   */
  getMetrics(): Record<string, unknown> {
    return {
      isActive: this.state.isActive,
      sleepingCount: this.state.sleepingParticipants.size,
      awakeCount: this.getAwakeParticipants().length,
      messagesSinceUserInput: this.state.messagesSinceUserInput,
      timeSinceLastTrigger: this.state.lastTriggerTime
        ? Date.now() - this.state.lastTriggerTime
        : null,
      config: this.config
    };
  }

  /**
   * Reset conversation state (e.g., when user becomes active)
   */
  resetState(): void {
    this.state.messagesSinceUserInput = 0;
    this.state.lastTriggerTime = Date.now();

    // Wake up all participants when user becomes active
    this.wakeUpParticipants();
  }

  /**
   * Trigger background conversation activity
   */
  private triggerBackgroundActivity(): void {
    try {
      const awakeParticipants = this.getAwakeParticipants();

      if (awakeParticipants.length < 2) {
        return;
      }

      // Select participants for background conversation
      const selectedParticipants = this.selectBackgroundParticipants(awakeParticipants);

      if (selectedParticipants.length > 0) {
        this.state.messagesSinceUserInput++;
        this.state.lastTriggerTime = Date.now();

        // Emit event or trigger response generation
        this.onBackgroundConversationTriggered(selectedParticipants);

        // Schedule next background activity
        this.scheduleNextCheck();
      }
    } catch (error) {
      throw new SchedulingError(
        `Failed to trigger background activity: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Select which participants should engage in background conversation
   */
  private selectBackgroundParticipants(awakeParticipants: AIParticipant[]): AIParticipant[] {
    // Simple selection: pick 1-2 participants with least recent activity
    const sortedByActivity = awakeParticipants.sort((a, b) => {
      const aLastResponse = a.lastResponseTime || 0;
      const bLastResponse = b.lastResponseTime || 0;
      return aLastResponse - bLastResponse;
    });

    const participantCount = Math.min(2, sortedByActivity.length);
    return sortedByActivity.slice(0, participantCount);
  }

  /**
   * Get participants that are awake and available
   */
  private getAwakeParticipants(): AIParticipant[] {
    return this.participants.filter(p =>
      p.isActive &&
      !p.isSleeping &&
      !this.state.sleepingParticipants.has(p.id)
    );
  }

  /**
   * Schedule the next background conversation check
   */
  private scheduleNextCheck(): void {
    if (this.state.activeTimer) {
      clearTimeout(this.state.activeTimer);
    }

    const delay = this.config.participantRotationMs + (Math.random() * 10000); // Add some randomness

    this.state.activeTimer = setTimeout(() => {
      if (this.state.isActive) {
        this.checkForBackgroundActivity();
      }
    }, delay);
  }

  /**
   * Check if background activity should occur
   */
  private checkForBackgroundActivity(): void {
    // This would typically check silence duration and trigger if needed
    // For now, we'll just schedule the next check
    if (this.state.messagesSinceUserInput < this.config.maxBackgroundMessages) {
      const awakeParticipants = this.getAwakeParticipants();

      if (awakeParticipants.length >= 2 && Math.random() < 0.3) {
        this.triggerBackgroundActivity();
      }
    }

    // Continue monitoring
    this.scheduleNextCheck();
  }

  /**
   * Schedule wake up for a sleeping participant
   */
  private scheduleWakeUp(participant: AIParticipant): void {
    const wakeUpDelay = 60000 + (Math.random() * 120000); // 1-3 minutes

    setTimeout(() => {
      if (this.state.sleepingParticipants.has(participant.id)) {
        if (Math.random() < this.config.wakeUpProbability) {
          this.state.sleepingParticipants.delete(participant.id);
          participant.isSleeping = false;
          participant.messageCount = 0;
        } else {
          // Schedule another wake up attempt
          this.scheduleWakeUp(participant);
        }
      }
    }, wakeUpDelay);
  }

  /**
   * Handle background conversation trigger event
   * This would be implemented by the orchestrator to actually generate responses
   */
  private onBackgroundConversationTriggered(participants: AIParticipant[]): void {
    // Emit event or call callback
    // In the actual implementation, this would trigger the orchestrator
    // to generate background responses from the selected participants

    // For now, just update participant activity
    participants.forEach(participant => {
      participant.lastResponseTime = Date.now();
      participant.messageCount = (participant.messageCount || 0) + 1;
    });
  }

  /**
   * Get participants eligible for wake up
   */
  getEligibleForWakeUp(): AIParticipant[] {
    return this.participants.filter(p =>
      p.isActive &&
      this.state.sleepingParticipants.has(p.id)
    );
  }

  /**
   * Force wake up specific participant
   */
  forceWakeUp(participantId: string): boolean {
    const participant = this.participants.find(p => p.id === participantId);
    if (!participant || !this.state.sleepingParticipants.has(participantId)) {
      return false;
    }

    this.state.sleepingParticipants.delete(participantId);
    participant.isSleeping = false;
    participant.messageCount = 0;
    return true;
  }

  /**
   * Force sleep specific participant
   */
  forceSleep(participantId: string): boolean {
    const participant = this.participants.find(p => p.id === participantId);
    if (!participant || this.state.sleepingParticipants.has(participantId)) {
      return false;
    }

    this.state.sleepingParticipants.add(participantId);
    participant.isSleeping = true;
    this.scheduleWakeUp(participant);
    return true;
  }
}