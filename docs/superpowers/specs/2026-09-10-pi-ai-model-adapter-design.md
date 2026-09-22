# Daily Translate pi-ai 模型适配层设计

## 1. 背景与目标

当前插件在 `background/service-worker.js` 中直接构造 Chat Completions 请求，因此协议固定为 `/chat/completions`，模型服务商兼容性由插件自行维护。目标是接入开源项目 pi 的 `@earendil-works/pi-ai` 适配层，让插件可以使用多个服务商和多种模型协议，同时保持以下边界：

- API Token、翻译文本、译文、监控数据和日志只保存在或经过用户自己的浏览器/API 服务。
- 不依赖 Daily Translate 的服务器或集中控制台。
- 保留划词翻译、整页翻译、串行段落队列、取消、监控和日志行为。
- 新版不兼容旧版配置；用户卸载旧扩展后重新安装并配置即可。

当前已核对 pi 源码版本为 `@earendil-works/pi-ai` `0.85.1`。pi 的核心接口是 `createModels()`、provider、`streamSimple()`/`completeSimple()`；provider 通过模型的 `api` 字段选择 OpenAI Chat Completions、OpenAI Responses、Anthropic Messages、Google Generative AI 或 Mistral Conversations 等实现。

## 2. 方案与范围

采用直接依赖并打包 pi-ai 的方案，不复制 pi 的协议实现，也不增加中转服务器。

### 2.1 首批支持

设置页提供 provider 选择和模型输入/建议。首批纳入浏览器可用、API Key 可直接调用的 provider：

- DeepSeek
- OpenAI
- Anthropic
- Google AI Studio
- OpenRouter
- xAI
- Groq
- Cerebras
- Mistral
- NVIDIA NIM
- Together AI
- Fireworks
- Hugging Face
- Moonshot/Kimi
- MiniMax
- Z.ai
- Baseten
- Vercel AI Gateway

模型目录用于推荐和能力元数据，不限制手动填写模型。自定义服务允许选择以下协议并填写任意模型和 Base URL：

- `openai-completions`
- `openai-responses`
- `anthropic-messages`
- `google-generative-ai`
- `mistral-conversations`

Amazon Bedrock、OAuth provider、Radius 及需要 Node-only 环境的功能不打包到扩展。

插件维护一个精简的 provider 注册表，记录 provider ID、默认 Base URL、默认 API 类型和可选的 pi 模型目录。手填模型未命中目录时，使用该注册表的默认 API 构造通用模型描述；不会根据模型名称或 URL 猜测协议。

### 2.2 流式语义

pi 的统一接口使用事件流。插件设置项从“启用流式响应”改为“实时显示译文”：

- 关闭：仍使用 pi 的事件流读取，但缓存 `text_delta`，完成后一次写入页面。
- 开启：收到 `text_delta` 后立即显示或更新译文。
- 底层是否使用 SSE 由 pi provider 决定，插件不再直接控制请求体中的 `stream` 字段。

这样可以统一各 provider 的响应解析，同时保留用户对页面展示时机的控制。

## 3. 配置模型

新版本使用全新的 `chrome.storage.local` 配置，不迁移旧字段：

```js
{
  providerId: "deepseek",
  apiType: "openai-completions",
  baseUrl: "https://api.deepseek.com",
  token: "...",
  model: "deepseek-chat",
  modelParameters: {
    temperature: 0,
    maxTokens: 2048,
    reasoning: "low",
    samplingParams: { top_p: 0.9 }
  },
  realtimeOutput: false,
  targetLanguage: "zh-CN"
}
```

- 内置 provider 默认填充 `apiType`、Base URL 和模型建议。
- Base URL 可覆盖，用于代理、内网网关和本地部署。
- `model` 既可以从 pi 目录选择，也可以手动填写未收录模型。
- 手填模型未命中目录时，使用所选 provider 的默认 API 和通用能力参数；自定义服务直接使用用户选择的 `apiType`。
- Token 仅传入 pi 请求选项的 `apiKey`，不写入网页 DOM。
- `modelParameters` 映射到 pi 的统一选项：`temperature`、`maxTokens`、`reasoning`、`samplingParams`，以及当前 provider 明确支持的专用字段。
- `model`、消息、`apiKey`、`signal`、`fetch`、`maxRetries` 和展示控制由插件管理，用户参数不能覆盖。
- 缺少 provider、协议、Base URL、Token 或 Model 时直接提示重新配置，不进行旧配置推断。

## 4. 运行时架构

```text
划词 / 整页段落
       |
       v
Service Worker 翻译入口
       |
       +-- 创建 pi Model 描述
       |     +-- 读取内置 provider/model 元数据
       |     +-- 未收录模型使用 provider 默认 api
       |     +-- 覆盖用户 Base URL
       |
       +-- createModels() 注册按需 provider
       |
       +-- models.streamSimple(model, context, options)
       |     +-- start
       |     +-- thinking_*（忽略）
       |     +-- text_delta
       |     +-- done
       |     +-- error
       |
       +-- 页面更新 / Token 统计 / 延迟统计 / 运行日志
```

新增的 pi 适配模块只负责：

1. 将插件的 system prompt、用户文本或批量 JSON 转换成 pi `Context`。
2. 将 pi 事件转换成现有的 `onChunk`、批量状态和完成结果。
3. 将 pi `AssistantMessage.usage` 映射到现有 Token 统计。
4. 将 pi 错误事件和 `errorMessage` 转成现有日志结构。

页面扫描、整页串行队列、批量 JSON 校验、补译、暂停和恢复逻辑保持不变。

请求选项固定为：

- 显式传入 Token。
- 传入当前请求的 `AbortSignal`。
- `maxRetries: 0`，避免隐藏的重复计费和改变整页请求顺序。
- 划词超时 30 秒，整页段落超时 60 秒。
- 关闭翻译、切页、切模式时取消当前请求。

## 5. 结构化批量翻译

整页多文本节点仍要求模型返回带 `id` 的 JSON。第一版不为不同 provider 强制注入结构化输出参数，因为 pi 模型目录不统一声明所有模型是否支持 JSON mode，盲目注入 OpenAI `response_format`、Google Schema 或 Mistral 专用字段会导致部分模型拒绝请求。

流程保持现状：

- 使用提示词约束 JSON 结构。
- 校验 JSON、条目数量、ID 唯一性和非空译文。
- 缺失条目逐项补译一次。
- 当前段落所有条目成功后才写回页面。
- 任意补译失败则保留整段原文并暂停后续段落。

## 6. 监控与日志

pi usage 映射如下：

```text
promptTokens     = input + cacheRead + cacheWrite
completionTokens = output
totalTokens      = totalTokens
```

模型统计 key 使用 `provider/model`，避免不同 provider 的同名模型合并。

延迟指标：

- TTFB：pi `onResponse` 回调时间。
- TTFT：第一个非空 `text_delta` 时间，thinking 事件不计入。
- 完成耗时：`done` 或 `error` 时间。
- 关闭实时显示时仍读取事件流并统计 TTFT，只是不立即更新页面。

日志至少保存：

```json
{
  "provider": "deepseek",
  "apiType": "openai-completions",
  "model": "deepseek-chat",
  "apiHost": "api.deepseek.com",
  "stage": "stream",
  "providerError": "原始错误文本",
  "elapsedMs": 913
}
```

超时、用户取消和标签页切换取消分别归类；Token/Bearer 脱敏和 8192 字符截断沿用现有规则。不记录请求原文、译文或 thinking 内容。

## 7. 打包与目录

新增 npm 构建层，根目录源码和 Chrome 加载目录分离：

```text
src/
  background/service-worker.js
  background/pi-adapter.js
  content/
  popup/
  options/

build/extension/
  manifest.json
  background/service-worker.js
  background/*.js
  content/
  popup/
  options/
  icons/
```

使用 esbuild：

```text
npm install --ignore-scripts
npm run build
```

只打包需要的 provider 和 API 适配器，不使用 `providers/all`。动态 import 生成 API chunk，主 Service Worker 只加载实际请求所需实现。构建使用 browser platform，禁止 Node-only 模块进入扩展。

Manifest 的后台配置使用 `type: "module"`，以便 Chrome Service Worker 支持 pi API chunk 的动态 `import()`；构建脚本必须把主 Service Worker 和所有相对路径 chunk 放在同一扩展目录，并在产物检查中验证每个 import 目标存在。

依赖固定 `@earendil-works/pi-ai` 精确版本，并保留 MIT License 说明。构建检查确认 bundle 不包含 `pi.dev`、`radius.pi.dev` 或遥测上报路径。pi 的 telemetry 是被动接口，插件不注入 telemetry context，也不调用上报功能。

Chrome 加载 `build/extension/`，不再直接加载源码根目录。README 需要同步更新安装、升级和开发命令。

## 8. 验证标准

实现阶段必须完成：

1. 构建成功，manifest 的 Service Worker 和所有 chunk 均位于 `build/extension/`。
2. Chrome 扩展静态检查通过，Service Worker、Content Script、Popup 和 Options 均可加载。
3. 使用本地 mock fetch/provider 验证 OpenAI Completions、OpenAI Responses、Anthropic、Google、Mistral 五类事件转换。
4. 验证实时显示开关、取消、超时、provider 错误和 usage 统计只产生一次记录。
5. 验证划词与整页翻译共用 pi 适配入口，整页仍保持单段串行和失败暂停。
6. 验证模型参数只映射到允许的 pi 选项，不能覆盖模型、消息、Token、signal 或重试策略。
7. 检查 bundle 不包含 Node-only 模块、pi 遥测地址或用户 Token。

## 9. 不在本次范围内

- 旧版配置迁移。
- Bedrock、OAuth、Radius 和其他 Node-only 功能。
- Daily Translate 自有代理服务器或模型目录服务器。
- 自动探测 API 类型。
- 为每个 provider 增加独立的设置页面。
- 修改页面扫描、整页队列和翻译结果回写算法。
