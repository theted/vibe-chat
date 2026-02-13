/**
 * Phind Service
 *
 * This service handles interactions with Phind models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class PhindService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Phind");
  }
}
