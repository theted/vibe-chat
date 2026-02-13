/**
 * Microsoft AI Service
 *
 * This service handles interactions with Microsoft AI models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class MicrosoftService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Microsoft AI");
  }
}
