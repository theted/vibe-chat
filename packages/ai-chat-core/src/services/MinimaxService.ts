/**
 * MiniMax Service
 *
 * This service handles interactions with MiniMax models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class MinimaxService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "MiniMax");
  }
}
