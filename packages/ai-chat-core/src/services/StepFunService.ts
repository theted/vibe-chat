/**
 * StepFun Service
 *
 * This service handles interactions with StepFun models via OpenRouter.
 */

import { OpenRouterCompatibleService } from "./base/OpenRouterCompatibleService.js";
import type { AIServiceConfig } from "@/types/index.js";

export class StepFunService extends OpenRouterCompatibleService {
  constructor(config: AIServiceConfig) {
    super(config, "StepFun");
  }
}
