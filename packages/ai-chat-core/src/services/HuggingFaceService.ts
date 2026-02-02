/**
 * Hugging Face Service
 *
 * This service handles interactions with Hugging Face models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class HuggingFaceService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Hugging Face");
  }
}
