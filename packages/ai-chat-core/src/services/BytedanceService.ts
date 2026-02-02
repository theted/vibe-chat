/**
 * ByteDance Service
 *
 * This service handles interactions with ByteDance models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class BytedanceService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "ByteDance");
  }
}
