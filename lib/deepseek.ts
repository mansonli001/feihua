/**
 * DeepSeek API 客户端封装
 * - OpenAI 兼容协议
 * - 支持流式输出和非流式调用
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

function getApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error(
      "DEEPSEEK_API_KEY 未配置。请在 .env.local 设置 DEEPSEEK_API_KEY=sk-xxx"
    );
  }
  return key;
}

/**
 * 非流式调用 DeepSeek，返回完整文本
 */
export async function chatCompletion(options: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  const apiKey = getApiKey();
  const {
    messages,
    temperature = 0.8,
    maxTokens = 1024,
    model = DEFAULT_MODEL,
  } = options;

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(
      `DeepSeek API 错误: ${response.status} ${response.statusText}. ${errText}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("DeepSeek API 返回格式异常");
  }
  return content;
}
