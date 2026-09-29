const form = document.querySelector("#settings-form");
const providerInput = document.querySelector("#provider");
const apiTypeGroup = document.querySelector("#api-type-group");
const apiTypeInput = document.querySelector("#api-type");
const baseUrlInput = document.querySelector("#base-url");
const tokenInput = document.querySelector("#token");
const modelInput = document.querySelector("#model");
const modelList = document.querySelector("#model-list");
const modelParametersInput = document.querySelector("#model-parameters");
const realtimeOutputInput = document.querySelector("#realtime-output");
const status = document.querySelector("#status");
const toggleToken = document.querySelector("#toggle-token");
const defaultModelParameters = {
  temperature: 0,
  maxTokens: 2048,
  thinking: false,
  effort: "low"
};
const modelParameterNames = new Set([
  "temperature",
  "maxTokens",
  "thinking",
  "effort",
  "samplingParams"
]);
const effortLevels = new Set(["minimal", "low", "medium", "high", "xhigh", "max"]);
const reservedSamplingParameters = new Set([
  "model",
  "messages",
  "input",
  "stream",
  "stream_options"
]);
let providers = [];
let tokenConfigured = false;

loadSettings();

providerInput.addEventListener("change", async () => {
  const provider = getSelectedProvider();
  apiTypeInput.value = provider.defaultApi;
  baseUrlInput.value = provider.baseUrl;
  modelInput.value = "";
  renderProviderFields();
  await loadProviderModels(provider.id);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "";

  const providerId = providerInput.value;
  const apiType = apiTypeInput.value;
  const baseUrl = baseUrlInput.value.trim();
  const model = modelInput.value.trim();
  const token = tokenInput.value.trim();

  if (!providers.some((provider) => provider.id === providerId)) {
    showStatus("请选择有效的服务商", true);
    return;
  }
  if (!isValidBaseUrl(baseUrl)) {
    showStatus("Base URL 必须是有效的 http 或 https 地址", true);
    return;
  }
  if (!model) {
    showStatus("Model 不能为空", true);
    return;
  }

  let modelParameters;
  try {
    modelParameters = parseModelParameters(modelParametersInput.value);
  } catch (error) {
    showStatus(error.message, true);
    return;
  }

  if (!token && !tokenConfigured) {
    showStatus("Token 不能为空", true);
    return;
  }

  const values = {
    providerId,
    apiType,
    baseUrl,
    model,
    modelParameters,
    realtimeOutput: realtimeOutputInput.checked
  };
  if (token) {
    values.token = token;
    values.tokenConfigured = true;
  }
  try {
    await chrome.storage.local.set(values);
    tokenConfigured = tokenConfigured || Boolean(token);
    tokenInput.value = "";
    showStatus("配置已保存", false);
    window.close();
  } catch (error) {
    console.error("Failed to save settings", error);
    reportRuntimeLog("settings_write_failed");
    showStatus("保存配置失败，请重试", true);
  }
});

toggleToken.addEventListener("click", () => {
  const isPassword = tokenInput.type === "password";
  tokenInput.type = isPassword ? "text" : "password";
  toggleToken.textContent = isPassword ? "隐藏" : "显示";
});

async function loadSettings() {
  try {
    const [catalogResponse, settings] = await Promise.all([
      chrome.runtime.sendMessage({ type: "get-provider-catalog" }),
      chrome.storage.local.get([
        "providerId",
        "apiType",
        "baseUrl",
        "model",
        "modelParameters",
        "realtimeOutput",
        "tokenConfigured"
      ])
    ]);
    if (!catalogResponse?.ok || !Array.isArray(catalogResponse.providers) || catalogResponse.providers.length === 0) {
      throw new Error("PROVIDER_CATALOG_UNAVAILABLE");
    }

    providers = catalogResponse.providers;
    for (const provider of providers) {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.name;
      providerInput.appendChild(option);
    }

    const selectedProvider = providers.find((provider) => provider.id === settings.providerId)
      || providers[0];
    providerInput.value = selectedProvider.id;
    apiTypeInput.value = settings.apiType || selectedProvider.defaultApi;
    baseUrlInput.value = settings.baseUrl || selectedProvider.baseUrl;
    modelInput.value = settings.model || "";
    modelParametersInput.value = settings.modelParameters && Object.keys(settings.modelParameters).length > 0
      ? JSON.stringify(settings.modelParameters, null, 2)
      : JSON.stringify(defaultModelParameters, null, 2);
    realtimeOutputInput.checked = settings.realtimeOutput === true;
    tokenConfigured = settings.tokenConfigured === true;
    renderProviderFields();
    await loadProviderModels(selectedProvider.id);
  } catch (error) {
    console.error("Failed to read settings", error);
    reportRuntimeLog("settings_read_failed");
    showStatus("读取配置失败，请重新打开设置页", true);
  }
}

function getSelectedProvider() {
  return providers.find((provider) => provider.id === providerInput.value);
}

function renderProviderFields() {
  apiTypeGroup.hidden = providerInput.value !== "custom";
  apiTypeInput.required = providerInput.value === "custom";
}

async function loadProviderModels(providerId) {
  modelList.replaceChildren();
  try {
    const response = await chrome.runtime.sendMessage({
      type: "get-provider-models",
      providerId
    });
    if (!response?.ok || !Array.isArray(response.models)) {
      throw new Error("MODEL_CATALOG_UNAVAILABLE");
    }
    for (const model of response.models) {
      const option = document.createElement("option");
      option.value = model.id;
      option.label = model.name === model.id ? "" : model.name;
      modelList.appendChild(option);
    }
  } catch (error) {
    console.error("Failed to read model catalog", error);
    showStatus("模型建议加载失败，仍可手动填写 Model", true);
  }
}

function parseModelParameters(value) {
  if (!value.trim()) {
    return {};
  }

  let parameters;
  try {
    parameters = JSON.parse(value);
  } catch {
    throw new Error("模型参数必须是合法的 JSON");
  }
  if (!isPlainObject(parameters)) {
    throw new Error("模型参数必须是 JSON 对象");
  }
  const unsupportedParameter = Object.keys(parameters).find((name) => !modelParameterNames.has(name));
  if (unsupportedParameter) {
    throw new Error(`不支持模型参数 ${unsupportedParameter}`);
  }
  if (
    parameters.temperature !== undefined &&
    (typeof parameters.temperature !== "number" || !Number.isFinite(parameters.temperature))
  ) {
    throw new Error("temperature 必须是有限数字");
  }
  if (
    parameters.maxTokens !== undefined &&
    (!Number.isSafeInteger(parameters.maxTokens) || parameters.maxTokens <= 0)
  ) {
    throw new Error("maxTokens 必须是正整数");
  }
  if (parameters.thinking !== undefined && typeof parameters.thinking !== "boolean") {
    throw new Error("thinking 必须是布尔值");
  }
  if (parameters.effort !== undefined && !effortLevels.has(parameters.effort)) {
    throw new Error("effort 必须是 minimal、low、medium、high、xhigh 或 max");
  }
  if (parameters.thinking === true && parameters.effort === undefined) {
    throw new Error("启用 thinking 时必须设置 effort");
  }
  if (parameters.samplingParams !== undefined) {
    if (!isPlainObject(parameters.samplingParams)) {
      throw new Error("samplingParams 必须是 JSON 对象");
    }
    const reservedParameter = Object.keys(parameters.samplingParams)
      .find((name) => reservedSamplingParameters.has(name));
    if (reservedParameter) {
      throw new Error(`samplingParams.${reservedParameter} 由插件管理，请移除`);
    }
  }
  return parameters;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidBaseUrl(value) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      !url.search &&
      !url.hash &&
      !/\s/.test(value)
    );
  } catch {
    return false;
  }
}

function showStatus(message, isError) {
  status.textContent = message;
  status.className = `status${isError ? " error" : ""}`;
}

function reportRuntimeLog(event) {
  try {
    chrome.runtime.sendMessage({ type: "runtime-log", event })
      .catch((error) => console.error("Failed to report runtime log", error));
  } catch (error) {
    console.error("Failed to report runtime log", error);
  }
}
