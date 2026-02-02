/**
 * Amazon Service
 *
 * This service handles interactions with Amazon models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class AmazonService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Amazon");
  }
}
