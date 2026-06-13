/**
 * AIRegistry - Owns the set of initialized AI services and the active-id list.
 *
 * Holds the live `services` Map and `activeIds` array that the orchestrator
 * exposes (and that the server/CLI read and mutate directly), so their
 * identities are preserved across the orchestrator's lifetime.
 */

import { AIServiceFactory } from "@/services/AIServiceFactory.js";
import type { OrchestratorAIService } from "@/utils/orchestrator/aiLookup.js";
import { normalizeAlias, toMentionAlias } from "@/utils/stringUtils.js";
import { runWithConcurrencyLimit } from "@/utils/concurrency.js";

const MAX_PARALLEL_AI_INITIALIZATIONS = 8;

export type ModelInitResult = {
  providerKey: string;
  modelKey: string;
  status: "ok" | "error";
  error?: string;
};

export class AIRegistry {
  readonly services: Map<string, OrchestratorAIService> = new Map();
  readonly activeIds: string[] = [];

  /**
   * Initialize the given AI configs in parallel (bounded). Each successful
   * service is added to `services` and `activeIds`.
   */
  async initialize(
    aiConfigs,
    options?: { skipHealthCheck?: boolean },
  ): Promise<ModelInitResult[]> {
    const results: ModelInitResult[] = [];
    const failedConfigs = [];
    const skipHealthCheck = options?.skipHealthCheck ?? false;

    const tasks = aiConfigs.map((config) => async () => {
      try {
        const service = AIServiceFactory.createServiceByName(
          config.providerKey,
          config.modelKey,
        );
        await service.initialize({ validateOnInit: !skipHealthCheck });

        const aiId = `${config.providerKey}_${config.modelKey}`;
        const displayName =
          config.displayName || `${service.getName()} ${service.getModel()}`;
        const rawAlias = config.alias || displayName;
        const alias = toMentionAlias(rawAlias, displayName);
        const emoji = config.emoji || "🤖";

        this.services.set(aiId, {
          service,
          config,
          id: aiId,
          name: service.getName(),
          displayName,
          displayAlias: rawAlias,
          alias,
          normalizedAlias: normalizeAlias(alias),
          emoji,
          isActive: true,
          lastMessageTime: 0,
        });

        this.activeIds.push(aiId);
        results.push({
          providerKey: config.providerKey,
          modelKey: config.modelKey,
          status: "ok",
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to initialize AI ${config.providerKey}_${config.modelKey}:`,
          error,
        );
        results.push({
          providerKey: config.providerKey,
          modelKey: config.modelKey,
          status: "error",
          error: errorMessage,
        });
        failedConfigs.push({
          providerKey: config.providerKey,
          modelKey: config.modelKey,
          displayName: config.displayName,
          alias: config.alias,
        });
      }
    });

    await runWithConcurrencyLimit(tasks, MAX_PARALLEL_AI_INITIALIZATIONS);

    console.log(`Initialized ${this.services.size} AI services`);

    if (failedConfigs.length > 0) {
      console.warn(
        `⚠️  ${failedConfigs.length} AI model(s) failed to initialize:`,
      );
      failedConfigs.forEach((failed) => {
        const label =
          failed.displayName ||
          failed.alias ||
          `${failed.providerKey}_${failed.modelKey}`;
        console.warn(
          `   • ${label} (${failed.providerKey}_${failed.modelKey})`,
        );
      });
    }

    return results;
  }

  /** Remove a service. Returns true if it existed. */
  remove(aiId: string): boolean {
    const existed = this.services.delete(aiId);
    if (existed) {
      const index = this.activeIds.indexOf(aiId);
      if (index !== -1) this.activeIds.splice(index, 1);
    }
    return existed;
  }

  clear(): void {
    this.services.clear();
    this.activeIds.length = 0;
  }
}
