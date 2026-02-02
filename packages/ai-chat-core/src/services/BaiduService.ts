/**
 * Baidu Service
 *
 * This service handles interactions with Baidu models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class BaiduService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Baidu");
  }
}
