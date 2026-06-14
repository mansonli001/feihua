import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/deepseek";
import { SYSTEM_PROMPT } from "@/lib/prompt";
import type { DetectResult } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DetectRequestBody {
  text?: string;
}

export async function POST(req: NextRequest) {
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
