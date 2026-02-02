export interface OpenRouterPricing {
  prompt?: number | string;
  completion?: number | string;
  request?: number | string;
  image?: number | string;
}

export interface OpenRouterModelRecord {
  id: string;
  name?: string;
  description?: string;
  context_length?: number;
  pricing?: OpenRouterPricing;
  type?: string;
  architecture?: {
    modality?: string | string[];
    modalities?: string[] | string;
  };
  supported_parameters?: string[];
  capabilities?: Record<string, unknown>;
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModelRecord[];
}

export interface OpenRouterModelSummary {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: OpenRouterPricing;
  capabilities: {
    vision?: boolean;
    tools?: boolean;
    json?: boolean;
  };
}

const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";

const normalizeModalities = (model: OpenRouterModelRecord): string[] => {
  const { architecture } = model;
  const modality = architecture?.modality ?? architecture?.modalities;
  if (!modality) return [];
  if (Array.isArray(modality)) return modality.map((entry) => String(entry));
  return String(modality)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const hasChatSupport = (model: OpenRouterModelRecord): boolean => {
  const supported = model.supported_parameters ?? [];
  if (supported.includes("messages")) {
    return true;
  }

  // Optionally check architecture.modality for chat support
  const modalities = normalizeModalities(model);
  if (modalities.some((m) => m.toLowerCase().includes("chat"))) {
    return true;
  }

  return false;
};

export async function fetchOpenRouterModels(options?: {
  fetcher?: typeof fetch;
  signal?: AbortSignal;
}): Promise<OpenRouterModelSummary[]> {
  const fetcher = options?.fetcher ?? fetch;
  const response = await fetcher(OPENROUTER_MODELS_URL, {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(
      `OpenRouter models request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as OpenRouterModelsResponse;
  if (!payload?.data || !Array.isArray(payload.data)) {
    throw new Error("OpenRouter models response is missing model data");
  }

  return payload.data.filter(hasChatSupport).map((model) => {
    const modalities = normalizeModalities(model);
    const supported = model.supported_parameters ?? [];

    return {
      id: model.id,
      name: model.name ?? model.id,
      description: model.description,
      contextLength: model.context_length,
      pricing: model.pricing,
      capabilities: {
        vision: modalities.includes("image"),
        tools:
          supported.includes("tools") ||
          supported.includes("tool_choice") ||
          supported.includes("functions"),
        json:
          supported.includes("response_format") ||
          supported.includes("json") ||
          supported.includes("structured_output"),
      },
    };
  });
}
