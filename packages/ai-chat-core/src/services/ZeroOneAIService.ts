/**
 * 01.AI Service
 *
 * This service handles interactions with 01.AI (Yi) models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class ZeroOneAIService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "01.AI");
  }
}
