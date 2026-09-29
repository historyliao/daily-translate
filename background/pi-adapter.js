import * as anthropicMessagesApi from "@earendil-works/pi-ai/api/anthropic-messages";
import * as googleGenerativeAIApi from "@earendil-works/pi-ai/api/google-generative-ai";
import * as mistralConversationsApi from "@earendil-works/pi-ai/api/mistral-conversations";
import * as openAICompletionsApi from "@earendil-works/pi-ai/api/openai-completions";
import * as openAIResponsesApi from "@earendil-works/pi-ai/api/openai-responses";
import { ANTHROPIC_MODELS } from "@earendil-works/pi-ai/providers/anthropic.models";
import { BASETEN_MODELS } from "@earendil-works/pi-ai/providers/baseten.models";
import { CEREBRAS_MODELS } from "@earendil-works/pi-ai/providers/cerebras.models";
import { DEEPSEEK_MODELS } from "@earendil-works/pi-ai/providers/deepseek.models";
import { FIREWORKS_MODELS } from "@earendil-works/pi-ai/providers/fireworks.models";
import { GOOGLE_MODELS } from "@earendil-works/pi-ai/providers/google.models";
import { GROQ_MODELS } from "@earendil-works/pi-ai/providers/groq.models";
import { HUGGINGFACE_MODELS } from "@earendil-works/pi-ai/providers/huggingface.models";
import { MINIMAX_CN_MODELS } from "@earendil-works/pi-ai/providers/minimax-cn.models";
import { MINIMAX_MODELS } from "@earendil-works/pi-ai/providers/minimax.models";
import { MISTRAL_MODELS } from "@earendil-works/pi-ai/providers/mistral.models";
import { MOONSHOTAI_CN_MODELS } from "@earendil-works/pi-ai/providers/moonshotai-cn.models";
import { MOONSHOTAI_MODELS } from "@earendil-works/pi-ai/providers/moonshotai.models";
import { NVIDIA_MODELS } from "@earendil-works/pi-ai/providers/nvidia.models";
import { OPENAI_MODELS } from "@earendil-works/pi-ai/providers/openai.models";
import { OPENROUTER_MODELS } from "@earendil-works/pi-ai/providers/openrouter.models";
import { TOGETHER_MODELS } from "@earendil-works/pi-ai/providers/together.models";
import { VERCEL_AI_GATEWAY_MODELS } from "@earendil-works/pi-ai/providers/vercel-ai-gateway.models";
import { XAI_MODELS } from "@earendil-works/pi-ai/providers/xai.models";
import { ZAI_MODELS } from "@earendil-works/pi-ai/providers/zai.models";

const PROVIDER_DEFINITIONS = [
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com", models: DEEPSEEK_MODELS, defaultApi: "openai-completions" },
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", models: OPENAI_MODELS, defaultApi: "openai-responses" },
  { id: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com", models: ANTHROPIC_MODELS, defaultApi: "anthropic-messages" },
  { id: "google", name: "Google", baseUrl: "https://generativelanguage.googleapis.com/v1beta", models: GOOGLE_MODELS, defaultApi: "google-generative-ai" },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", models: OPENROUTER_MODELS, defaultApi: "openai-completions" },
  { id: "xai", name: "xAI", baseUrl: "https://api.x.ai/v1", models: XAI_MODELS, defaultApi: "openai-responses" },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", models: GROQ_MODELS, defaultApi: "openai-completions" },
  { id: "cerebras", name: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", models: CEREBRAS_MODELS, defaultApi: "openai-completions" },
  { id: "mistral", name: "Mistral", baseUrl: "https://api.mistral.ai", models: MISTRAL_MODELS, defaultApi: "mistral-conversations" },
  { id: "nvidia", name: "NVIDIA", baseUrl: "https://integrate.api.nvidia.com/v1", models: NVIDIA_MODELS, defaultApi: "openai-completions" },
  { id: "together", name: "Together", baseUrl: "https://api.together.ai/v1", models: TOGETHER_MODELS, defaultApi: "openai-completions" },
  { id: "fireworks", name: "Fireworks", baseUrl: "https://api.fireworks.ai/inference", models: FIREWORKS_MODELS, defaultApi: "openai-completions" },
  { id: "huggingface", name: "Hugging Face", baseUrl: "https://router.huggingface.co/v1", models: HUGGINGFACE_MODELS, defaultApi: "openai-completions" },
  { id: "moonshotai", name: "Moonshot AI", baseUrl: "https://api.moonshot.ai/v1", models: MOONSHOTAI_MODELS, defaultApi: "openai-completions" },
  { id: "moonshotai-cn", name: "Moonshot AI CN", baseUrl: "https://api.moonshot.cn/v1", models: MOONSHOTAI_CN_MODELS, defaultApi: "openai-completions" },
  { id: "minimax", name: "MiniMax", baseUrl: "https://api.minimax.io/anthropic", models: MINIMAX_MODELS, defaultApi: "anthropic-messages" },
  { id: "minimax-cn", name: "MiniMax CN", baseUrl: "https://api.minimaxi.com/anthropic", models: MINIMAX_CN_MODELS, defaultApi: "anthropic-messages" },
  { id: "zai", name: "Z.AI", baseUrl: "https://api.z.ai/api/coding/paas/v4", models: ZAI_MODELS, defaultApi: "openai-completions" },
  { id: "baseten", name: "Baseten", baseUrl: "https://inference.baseten.co/v1", models: BASETEN_MODELS, defaultApi: "openai-completions" },
  { id: "vercel-ai-gateway", name: "Vercel AI Gateway", baseUrl: "https://ai-gateway.vercel.sh", models: VERCEL_AI_GATEWAY_MODELS, defaultApi: "anthropic-messages" }
];
const CUSTOM_APIS = new Set([
  "openai-completions",
  "openai-responses",
  "anthropic-messages",
  "google-generative-ai",
  "mistral-conversations"
]);
const API_IMPLEMENTATIONS = {
  "openai-completions": openAICompletionsApi,
  "openai-responses": openAIResponsesApi,
  "anthropic-messages": anthropicMessagesApi,
  "google-generative-ai": googleGenerativeAIApi,
  "mistral-conversations": mistralConversationsApi
};
const providers = new Map(PROVIDER_DEFINITIONS.map((provider) => [provider.id, provider]));

export function getProviderCatalog() {
  return [
    ...PROVIDER_DEFINITIONS.map(({ id, name, baseUrl, defaultApi }) => ({
      id,
      name,
      baseUrl,
      defaultApi
    })),
    { id: "custom", name: "自定义服务", baseUrl: "", defaultApi: "openai-completions" }
  ];
}

export function getProviderModels(providerId) {
  const provider = providers.get(providerId);
  if (!provider) {
    return [];
  }
  return Object.values(provider.models).map((model) => ({
    id: model.id,
    name: model.name,
    api: model.api,
    reasoning: model.reasoning === true
  }));
}

export function validateProviderSettings(providerId, apiType) {
  if (providerId === "custom") {
    return CUSTOM_APIS.has(apiType);
  }
  return providers.has(providerId);
}

export function resolveProviderApi(providerId, modelId, apiType) {
  if (providerId === "custom") {
    return CUSTOM_APIS.has(apiType) ? apiType : "";
  }
  const provider = providers.get(providerId);
  return Object.values(provider?.models || {}).find((model) => model.id === modelId)?.api
    || provider?.defaultApi
    || "";
}

export async function streamPiTranslation({
  providerId,
  apiType,
  baseUrl,
  token,
  modelId,
  modelParameters,
  systemPrompt,
  messages,
  signal,
  timeoutMs,
  onResponse,
  onText,
  onThinking,
  onActivity
}) {
  const provider = providers.get(providerId);
  if ((!provider && providerId !== "custom") || !validateProviderSettings(providerId, apiType)) {
    throw new Error("INVALID_PROVIDER");
  }

  const catalogModel = Object.values(provider?.models || {}).find((model) => model.id === modelId);
  const resolvedApi = resolveProviderApi(providerId, modelId, apiType);
  const api = API_IMPLEMENTATIONS[resolvedApi];
  if (!api) {
    throw new Error("INVALID_PROVIDER");
  }
  const reasoningOff = modelParameters.reasoning === "off";
  const model = catalogModel
    ? { ...catalogModel, baseUrl }
    : {
        id: modelId,
        name: modelId,
        api: resolvedApi,
        provider: providerId,
        baseUrl,
        reasoning: modelParameters.reasoning !== undefined,
        ...(reasoningOff ? { compat: { supportsDeveloperRole: false } } : {}),
        input: ["text"],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: 128000,
        maxTokens: modelParameters.maxTokens || 8192
      };
  const context = {
    systemPrompt,
    messages: messages.map((message, index) => message.role === "user"
      ? { role: "user", content: message.content, timestamp: Date.now() + index }
      : {
          role: "assistant",
          content: [{ type: "text", text: message.content }],
          api: resolvedApi,
          provider: providerId,
          model: modelId,
          usage: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            totalTokens: 0,
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
          },
          stopReason: "stop",
          timestamp: Date.now() + index
        })
  };
  const stream = api.streamSimple(model, context, {
    ...modelParameters,
    reasoning: reasoningOff ? undefined : modelParameters.reasoning,
    apiKey: token,
    signal,
    timeoutMs,
    maxRetries: 0,
    cacheRetention: "none",
    onResponse: (response) => onResponse(response.status)
  });

  for await (const event of stream) {
    if (event.type === "text_delta" && event.delta) {
      onText(event.delta);
    } else if (event.type === "thinking_delta" && event.delta) {
      onActivity();
      onThinking(event.delta);
    }
  }

  const result = await stream.result();
  if (result.stopReason === "length") {
    const error = new Error("OUTPUT_TRUNCATED");
    error.usage = result.usage;
    error.stopReason = result.stopReason;
    throw error;
  }
  if (result.stopReason === "error" || result.stopReason === "aborted") {
    const error = new Error(result.stopReason === "aborted" ? "PI_ABORTED" : "PI_ERROR");
    error.providerError = result.errorMessage || "Model provider request failed";
    error.usage = result.usage;
    error.stopReason = result.stopReason;
    throw error;
  }
  return {
    usage: result.usage,
    stopReason: result.stopReason,
    responseModel: result.responseModel || result.model
  };
}
