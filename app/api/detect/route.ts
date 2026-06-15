import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/deepseek";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import type { DetectResult } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---- 简易 IP 速率限制 ---- */
const RATE_LIMIT_WINDOW = 60_000; // 1 分钟
const RATE_LIMIT_MAX = 10; // 每窗口最多 10 次
const ipRequests = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequests.get(ip);
  if (!record || now > record.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  record.count++;
  return record.count <= RATE_LIMIT_MAX;
}

// 定期清理过期记录
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    ipRequests.forEach((rec, ip) => {
      if (now > rec.resetAt) keysToDelete.push(ip);
    });
    keysToDelete.forEach((ip) => ipRequests.delete(ip));
  }, 120_000);
}

interface DetectRequestBody {
  text?: string;
}

export async function POST(req: NextRequest) {
  // 速率限制
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: "请求过于频繁，请稍后再试" },
      { status: 429 }
    );
  }
  let body: DetectRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "请求体不是合法 JSON" },
      { status: 400 }
    );
  }

  const text = (body.text || "").trim();
  if (!text || text.length < 10) {
    return NextResponse.json(
      { ok: false, error: "文本至少需要 10 个字" },
      { status: 400 }
    );
  }
  if (text.length > 500) {
    return NextResponse.json(
      { ok: false, error: "文本不要超过 500 字" },
      { status: 400 }
    );
  }

  let raw: string;
  try {
    raw = await chatCompletion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `请检测以下文本：\n\n${text}` },
      ],
      temperature: 0.8,
      maxTokens: 500,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI 调用失败";
    console.error("[/api/detect] DeepSeek 调用失败：", msg);
    return NextResponse.json(
      { ok: false, error: "检测服务暂时不可用，请稍后再试" },
      { status: 502 }
    );
  }

  // 解析 JSON
  let result: DetectResult;
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    result = JSON.parse(clean);
  } catch {
    console.error("[/api/detect] JSON 解析失败：", raw.slice(0, 200));
    return NextResponse.json(
      { ok: false, error: "检测结果解析失败，请重试" },
      { status: 502 }
    );
  }

  // 校验字段
  if (
    typeof result.pct !== "number" ||
    typeof result.school !== "string" ||
    typeof result.best_sentence !== "string" ||
    typeof result.verdict !== "string"
  ) {
    return NextResponse.json(
      { ok: false, error: "检测结果格式异常，请重试" },
      { status: 502 }
    );
  }

  // 钳制 pct 到 0-100
  result.pct = Math.round(Math.max(0, Math.min(100, result.pct)));

  return NextResponse.json({ ok: true, result });
}
