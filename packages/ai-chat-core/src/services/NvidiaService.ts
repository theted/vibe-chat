/**
 * NVIDIA Service
 *
 * This service handles interactions with NVIDIA models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class NvidiaService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "NVIDIA");
  }
}
