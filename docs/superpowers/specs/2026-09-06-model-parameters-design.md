# 模型参数配置设计

## 目标

在设置页的 Model 下方增加可选的“模型参数（JSON）”，让用户按模型和 OpenAI-compatible 服务的能力配置影响速度、质量及输出长度的请求参数。配置统一用于划词、整页和段落补译请求。

## 配置格式

`chrome.storage.local.modelParameters` 保存一个 JSON 对象。设置为空时保存空对象，请求中不发送额外模型参数，由 API 使用默认值。

可配置参数包括但不限于：

- `temperature`、`top_p`；
- `max_tokens`、`max_completion_tokens`；
- `reasoning_effort`；
- 厂商扩展参数，例如 `thinking`。

插件管理并禁止配置以下字段：

- `model`：使用独立的 Model 输入框；
- `messages`：由翻译提示词和待翻译文本生成；
- `stream`：使用“启用流式响应”开关；
- `stream_options`：用于流式 Token 统计；
- `response_format`：整页批量翻译按协议需要时由插件设置。

设置页保存前校验内容是合法 JSON 对象且不包含保留字段。Service Worker 在发送请求前再次校验存储值，避免手工修改存储后破坏请求结构。

## 请求合并

```text
模型参数（JSON）
        |
        v
chrome.storage.local.modelParameters
        |
        v
Service Worker 校验对象和保留字段
        |
        v
合并到 Chat Completions 请求体
        |
        +--> 插件写入 model/messages/stream/stream_options
        |
        +--> 整页批量请求按现有规则写入 response_format
```

删除固定的 `temperature: 0` 和 DeepSeek `thinking: {type: "disabled"}`。如果用户需要相同行为，可显式配置：

```json
{
  "temperature": 0,
  "thinking": {
    "type": "disabled"
  }
}
```

API 不支持某个参数时，保留现有行为，直接展示并记录服务端原始错误，不自动删除参数重试。

## 验证

- 空配置不向请求体增加模型参数；
- 合法的基础类型、对象和数组参数原样进入所有翻译请求；
- 非 JSON、数组或包含保留字段的顶层配置不能保存；
- 存储中的非法配置不能进入 fetch，并返回明确错误；
- 模型参数不能覆盖插件管理的请求字段；
- 整页批量 JSON 约束、流式 Token 统计和现有错误日志保持不变；
- 执行 JavaScript 语法、Manifest JSON、Popup 元素绑定和差异检查；
- 真实 API 参数兼容性由用户使用所配置的模型服务验证。
