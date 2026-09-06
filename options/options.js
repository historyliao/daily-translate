const form = document.querySelector("#settings-form");
const baseUrlInput = document.querySelector("#base-url");
const tokenInput = document.querySelector("#token");
const modelInput = document.querySelector("#model");
const modelParametersInput = document.querySelector("#model-parameters");
const streamEnabledInput = document.querySelector("#stream-enabled");
const status = document.querySelector("#status");
const toggleToken = document.querySelector("#toggle-token");
let tokenConfigured = false;
const reservedModelParameters = new Set([
  "model",
  "messages",
  "stream",
  "stream_options",
  "response_format"
]);

loadSettings();

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "";

  const baseUrl = baseUrlInput.value.trim();
  const model = modelInput.value.trim();
  const token = tokenInput.value.trim();

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
    baseUrl,
    model,
    modelParameters,
    streamEnabled: streamEnabledInput.checked
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
    const settings = await chrome.storage.local.get([
      "baseUrl",
      "model",
      "modelParameters",
      "streamEnabled",
      "tokenConfigured"
    ]);
    baseUrlInput.value = settings.baseUrl || "";
    modelInput.value = settings.model || "";
    modelParametersInput.value = settings.modelParameters && Object.keys(settings.modelParameters).length > 0
      ? JSON.stringify(settings.modelParameters, null, 2)
      : "";
    streamEnabledInput.checked = settings.streamEnabled === true;
    tokenConfigured = settings.tokenConfigured === true;
  } catch (error) {
    console.error("Failed to read settings", error);
    reportRuntimeLog("settings_read_failed");
    showStatus("读取配置失败，请重新打开设置页", true);
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
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters)) {
    throw new Error("模型参数必须是 JSON 对象");
  }
  const reservedParameter = Object.keys(parameters).find((name) => reservedModelParameters.has(name));
  if (reservedParameter) {
    throw new Error(`模型参数 ${reservedParameter} 由插件管理，请从 JSON 中移除`);
  }
  return parameters;
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
