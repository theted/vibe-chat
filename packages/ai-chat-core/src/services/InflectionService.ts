/**
 * Inflection AI Service
 *
 * This service handles interactions with Inflection AI models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class InflectionService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Inflection AI");
  }
}
