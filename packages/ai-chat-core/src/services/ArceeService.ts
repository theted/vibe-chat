/**
 * Arcee AI Service
 *
 * This service handles interactions with Arcee AI models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class ArceeService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Arcee AI");
  }
}
