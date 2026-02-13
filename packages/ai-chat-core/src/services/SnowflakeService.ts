/**
 * Snowflake Service
 *
 * This service handles interactions with Snowflake models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class SnowflakeService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Snowflake");
  }
}
