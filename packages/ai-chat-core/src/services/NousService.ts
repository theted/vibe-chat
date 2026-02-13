/**
 * Nous Research Service
 *
 * This service handles interactions with Nous Research models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class NousService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Nous Research");
  }
}
