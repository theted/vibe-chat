/**
 * Xiaomi Service
 *
 * This service handles interactions with Xiaomi models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class XiaomiService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Xiaomi");
  }
}
