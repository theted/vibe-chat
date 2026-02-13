/**
 * Databricks Service
 *
 * This service handles interactions with Databricks models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class DatabricksService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "Databricks");
  }
}
