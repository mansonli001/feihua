"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { toBlob, toPng } from "html-to-image";
import {
  SCHOOL_MAP,
  getRank,
  generateSerial,
  type DetectResult,
} from "@/lib/constants";

/* 微信浏览器检测 */
function isWeChatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("micromessenger");
}

/* 动态颜色：根据废话含量区间 */
function getPctColor(pct: number): { main: string; glow: string } {
  if (pct <= 35) return { main: "#3d9e6a", glow: "rgba(61,158,106,.35)" };
  if (pct <= 65) return { main: "#d97706", glow: "rgba(217,119,6,.35)" };
  if (pct <= 85) return { main: "#dc6830", glow: "rgba(220,104,48,.35)" };
  return { main: "#b91c1c", glow: "rgba(185,28,28,.35)" };
}

/* ---- Canvas 圆环组件 ---- */
function StampRing({ pct }: { pct: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const breathRef = useRef<number>(0);
  const currentPctRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { main, glow } = getPctColor(pct);
    const size = 240;
    const cx = size / 2;
    const cy = size / 2;
    const r = 100;
    const lw = 10;

    function draw(currentPct: number) {
      ctx!.clearRect(0, 0, size, size);

      // track
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.strokeStyle = "rgba(128,128,128,0.1)";
      ctx!.lineWidth = lw;
      ctx!.stroke();

      if (currentPct <= 0) return;

      // glow pass
      ctx!.save();
      ctx!.shadowColor = glow;
      ctx!.shadowBlur = 18;
      ctx!.beginPath();
      ctx!.arc(
        cx,
        cy,
        r,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (currentPct / 100)
      );
      ctx!.strokeStyle = main;
      ctx!.lineWidth = lw + 2;
      ctx!.lineCap = "round";
      ctx!.stroke();
      ctx!.restore();

      // crisp pass
      ctx!.beginPath();
      ctx!.arc(
        cx,
        cy,
        r,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * (currentPct / 100)
      );
      ctx!.strokeStyle = main;
      ctx!.lineWidth = lw;
      ctx!.lineCap = "round";
      ctx!.stroke();

      // end dot
      const angle = -Math.PI / 2 + Math.PI * 2 * (currentPct / 100);
      const ex = cx + r * Math.cos(angle);
      const ey = cy + r * Math.sin(angle);
      ctx!.beginPath();
      ctx!.arc(ex, ey, lw / 2 + 1, 0, Math.PI * 2);
      ctx!.fillStyle = main;
      ctx!.fill();
    }

    // animate fill
    const dur = 1200;
    const t0 = performance.now();
    const startPct = 0;

    function tick(ts: number) {
      const p = Math.min((ts - t0) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      currentPctRef.current = startPct + (pct - startPct) * ease;
      draw(currentPctRef.current);
      if (p < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        currentPctRef.current = pct;
        draw(pct);
        startBreath();
      }
    }
    animRef.current = requestAnimationFrame(tick);

    function startBreath() {
      const bt0 = performance.now();
      let lastFrame = 0;
      function bTick(ts: number) {
        // 节流至约 15fps，呼吸动画无需高帧率
        if (ts - lastFrame < 66) {
          breathRef.current = requestAnimationFrame(bTick);
          return;
        }
        lastFrame = ts;
        const phase = (ts - bt0) / 1000;
        const pulse = 0.04 * Math.sin(phase * Math.PI * 0.7);
        const v = currentPctRef.current + pulse * currentPctRef.current;
        draw(v);
        breathRef.current = requestAnimationFrame(bTick);
      }
      breathRef.current = requestAnimationFrame(bTick);
    }

    return () => {
      cancelAnimationFrame(animRef.current);
      cancelAnimationFrame(breathRef.current);
    };
  }, [pct]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={240}
      className="absolute top-0 left-0 w-full h-full"
    />
  );
}

interface ResultScreenProps {
  result: DetectResult;
  onRetry: () => void;
}

export default function ResultScreen({ result, onRetry }: ResultScreenProps) {
  const certRef = useRef<HTMLDivElement>(null);
  const pct = Math.round(Math.max(0, Math.min(100, result.pct)));
  const rank = getRank(pct);
  const school = result.school || "职场太极宗";
  const theme = SCHOOL_MAP[school] || SCHOOL_MAP["职场太极宗"];
  const serial = useRef(generateSerial()).current;
  const pctColor = getPctColor(pct).main;

  /* ---- 动画状态 ---- */
  const [animatedPct, setAnimatedPct] = useState(0);
  const [stampVisible, setStampVisible] = useState(false);

  /* ---- 图片预览弹窗（微信浏览器长按保存） ---- */
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    // 数字跳动 0.8s
    const dur = 800;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setAnimatedPct(Math.round(e * pct));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // 橡皮章弹出（1.5s 后）
    const t3 = setTimeout(() => setStampVisible(true), 1500);

    return () => {
      clearTimeout(t3);
    };
  }, [pct]);

  /* ---- 复制/下载 ---- */
  const handleCopyText = useCallback(() => {
    const text = [
      `废话检测报告`,
      ``,
      `废话含量：${pct}%`,
      `流派：${school}`,
      `段位：${rank.name}（${rank.desc}）`,
      ``,
      `最佳废话样本：${result.best_sentence}`,
      ``,
      `废话检测局裁定：${result.verdict}`,
      ``,
      `测测你的废话含量 → feihua.starfluxes.com`,
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      alert("已复制，发小红书去！");
    }).catch(() => {
      // 剪贴板权限被拒绝时，fallback：选中文本
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); alert("已复制，发小红书去！"); }
      catch { alert("复制失败，请手动复制"); }
      document.body.removeChild(ta);
    });
  }, [pct, school, rank, result]);

  /* ---- 截图辅助：冻结 DOM 状态，确保截图与显示一致 ---- */
  const prepareForCapture = useCallback(() => {
    const el = certRef.current;
    if (!el) return null;

    // 将 canvas 元素替换为静态 img（html-to-image 无法序列化 canvas 像素）
    const canvasElements = el.querySelectorAll("canvas");
    const imgReplacements: { canvas: HTMLCanvasElement; img: HTMLImageElement }[] = [];

    canvasElements.forEach((canvas) => {
      const img = document.createElement("img");
      img.src = canvas.toDataURL("image/png");
      // 先拷贝 cssText（包含 Tailwind 生成的完整样式），再覆盖宽高确保正确
      img.style.cssText = canvas.style.cssText;
      img.style.width = canvas.style.width || `${canvas.offsetWidth}px`;
      img.style.height = canvas.style.height || `${canvas.offsetHeight}px`;
      img.className = canvas.className;
      canvas.parentNode?.replaceChild(img, canvas);
      imgReplacements.push({ canvas, img });
    });

    // 冻结呼吸动画：移除动画类，设置静态 box-shadow
    const breatheElements = el.querySelectorAll(".stamp-inner-breathe");
    breatheElements.forEach((elem) => {
      (elem as HTMLElement).style.animation = "none";
      (elem as HTMLElement).style.boxShadow = "0 0 0 2px rgba(192, 57, 43, 0.12)";
    });

    return { el, imgReplacements, breatheElements };
  }, []);

  const restoreAfterCapture = useCallback(
    (ctx: { imgReplacements: { canvas: HTMLCanvasElement; img: HTMLImageElement }[]; breatheElements: NodeListOf<Element> }) => {
      ctx.imgReplacements.forEach(({ canvas, img }) => {
        img.parentNode?.replaceChild(canvas, img);
      });
      ctx.breatheElements.forEach((elem) => {
        (elem as HTMLElement).style.animation = "";
        (elem as HTMLElement).style.boxShadow = "";
      });
    },
    []
  );

  const captureCert = useCallback(async (): Promise<Blob | null> => {
    const ctx = prepareForCapture();
    if (!ctx) return null;
    try {
      return await toBlob(ctx.el, {
        pixelRatio: 2,
        backgroundColor: "#f9f9fc",
        cacheBust: true,
        includeQueryParams: true,
      });
    } finally {
      restoreAfterCapture(ctx);
    }
  }, [prepareForCapture, restoreAfterCapture]);

  const captureCertDataUrl = useCallback(async (): Promise<string | null> => {
    const ctx = prepareForCapture();
    if (!ctx) return null;
    try {
      return await toPng(ctx.el, {
        pixelRatio: 2,
        backgroundColor: "#f9f9fc",
        cacheBust: true,
        includeQueryParams: true,
      });
    } finally {
      restoreAfterCapture(ctx);
    }
  }, [prepareForCapture, restoreAfterCapture]);

  const handleCopyImage = useCallback(async () => {
    try {
      // 微信浏览器：弹出图片预览，提示长按保存
      if (isWeChatBrowser()) {
        const dataUrl = await captureCertDataUrl();
        if (!dataUrl) return;
        setPreviewImage(dataUrl);
        return;
      }

      const blob = await captureCert();
      if (!blob) return;
      // 优先尝试剪贴板（桌面端），失败则直接下载（移动端）
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        alert("检测卡已复制到剪贴板！");
      } catch {
        // 移动端不支持剪贴板写图片，直接下载
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `废话检测-${pct}%.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("图片已下载，去相册分享吧！");
      }
    } catch {
      alert("图片生成失败，请长按证书区域截图分享");
    }
  }, [captureCert, captureCertDataUrl, pct]);

  const handleDownloadImage = useCallback(async () => {
    try {
      // 微信浏览器：弹出图片预览，提示长按保存
      if (isWeChatBrowser()) {
        const dataUrl = await captureCertDataUrl();
        if (!dataUrl) return;
        setPreviewImage(dataUrl);
        return;
      }

      // 非微信环境：使用 blob 下载
      const blob = await captureCert();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `废话检测-${pct}%.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("图片生成失败，请长按证书区域截图分享");
    }
  }, [captureCert, captureCertDataUrl, pct]);

  return (
    <section className="space-y-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <span className="label-caps text-secondary mb-1 block">
            OFFICIAL AUDIT REPORT / {serial}
          </span>
          <h2 className="text-[22px] md:text-[32px] font-semibold text-on-surface tracking-[-0.01em]">
            废话检测报告
          </h2>
        </div>
        <div className="flex gap-sm">
          <button
            className="px-3 py-1.5 border-[1.5px] border-primary text-[12px] font-semibold btn-press bg-surface hover:bg-surface-container-low transition-colors"
            onClick={onRetry}
          >
            重新审计
          </button>
          <div className="flex items-center px-3 py-1.5 bg-primary/5 border border-primary text-primary text-[12px] font-semibold">
            官方认证
          </div>
        </div>
      </div>

      {/* Percent Card */}
      <div className="border-[1.5px] border-primary bg-surface-container-lowest p-lg relative overflow-hidden neo-shadow">
        <div className="flex flex-col items-center text-center py-8">
          <span className="label-caps text-secondary tracking-widest mb-4">
            VERBIAGE DENSITY / 废话含量
          </span>
          <div
            className="font-metric text-[80px] leading-none mb-2"
            style={{ color: pctColor }}
          >
            {animatedPct}%
          </div>
          <div
            className="font-serif-quote text-[15px] leading-[1.6] max-w-sm mt-2"
            style={{ color: theme.text }}
          >
            {pct >= 80
              ? "警告：检测到极高浓度的言语冗余。建议立即进行语言精简手术。"
              : pct >= 50
              ? "您的言语含水量已达到防汛标准，信息密度堪忧。"
              : pct >= 20
              ? "尚可，但仍有优化空间。废话含量在可控范围内。"
              : "恭喜，您的语言精炼度已超过绝大多数人。"}
          </div>
        </div>

        {/* Progress Scale */}
        <div className="mt-8">
          <div className="flex justify-between mb-2">
            <span className="label-caps text-secondary">AUDIT SCALE</span>
            <span className="label-caps font-bold" style={{ color: pctColor }}>
              {rank.name}
            </span>
          </div>
          <div className="h-6 border-[1.5px] border-primary bg-surface-container-low relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out progress-stripe"
              style={{
                width: `${pct}%`,
                backgroundColor: theme.barColor,
              }}
            />
          </div>
          <div className="flex justify-between mt-2 label-caps text-[10px] text-on-surface-variant">
            <span>纯净</span>
            <span>学徒</span>
            <span>宗师</span>
            <span>至尊</span>
          </div>
        </div>
      </div>

      {/* Attributes Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <div className="border-[1.5px] border-primary bg-surface-container-low p-md flex items-center gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{ backgroundColor: theme.barColor, color: "#fff" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <div>
            <div className="label-caps text-secondary">流派认定 / SCHOOL</div>
            <div className="text-xl font-semibold text-primary">{school}</div>
          </div>
        </div>
        <div className="border-[1.5px] border-primary bg-surface-container-low p-md flex items-center gap-4">
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{ backgroundColor: theme.barColor, color: "#fff" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
            </svg>
          </div>
          <div>
            <div className="label-caps text-secondary">段位评估 / RANK</div>
            <div className="text-xl font-semibold text-primary">
              {rank.name}
              <span className="text-sm font-normal text-on-surface-variant ml-2">
                {rank.desc}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Verdict Card */}
      <div
        className="border-[1.5px] p-8 neo-shadow relative overflow-hidden transition-colors duration-500"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
        }}
      >
        <div className="relative z-10">
          <span
            className="label-caps block mb-4 opacity-70"
            style={{ color: theme.text }}
          >
            官方裁定 / FINAL VERDICT
          </span>
          <p
            className="text-lg md:text-2xl font-bold leading-[1.3] mb-6"
            style={{ color: theme.text }}
          >
            {result.verdict}
          </p>
          <div
            className="pt-4"
            style={{ borderTop: `1px solid ${theme.border}` }}
          >
            <span
              className="label-caps block mb-3 opacity-60"
              style={{ color: theme.text }}
            >
              审计样本 / AUDIT SAMPLE
            </span>
            <blockquote
              className="font-serif-quote text-[15px] leading-[1.6] opacity-90"
              style={{ color: theme.text }}
            >
              &ldquo;{result.best_sentence}&rdquo;
            </blockquote>
          </div>
        </div>
        {/* 橡皮章 */}
        <div className="absolute -right-2 -top-2">
          <div className="w-14 h-14 rounded-full border-[2.5px] border-dashed border-[#c0392b] flex flex-col items-center justify-center stamp-animate stamp-inner-breathe bg-white/70 backdrop-blur-sm">
            <span className="text-[14px] leading-none text-[#c0392b]">✓</span>
            <span className="text-[7px] font-medium text-[#c0392b] leading-none mt-0.5">
              已核准
            </span>
            <span className="text-[4.5px] text-[#c0392b] tracking-[0.12em] opacity-75 leading-none">
              CERTIFIED
            </span>
          </div>
        </div>
      </div>

      {/* Certificate */}
      <div
        ref={certRef}
        className="bg-white cert-border p-8 md:p-10 max-w-[500px] mx-auto shadow-xl relative"
      >
        <div className="absolute inset-3 border border-primary/10 pointer-events-none" />
        <div className="absolute inset-5 border border-dashed border-primary/20 pointer-events-none" />

        {/* 标题 + 装饰线 */}
        <div className="text-center mb-10 relative z-10">
          <div className="label-caps text-[#162839]/60 tracking-[0.4em] mb-3">
            CERTIFICATE OF LINGUISTIC REDUNDANCY
          </div>
          <div className="w-[60px] h-[1px] bg-[#162839]/30 mx-auto mb-4" />
          <h3 className="text-[22px] md:text-[26px] font-bold text-[#162839] tracking-[0.08em] leading-[1.4]">
            废话{rank.name}认证
          </h3>
        </div>

        {/* 两列布局：左标签 右数值 */}
        <div className="space-y-5 relative z-10">
          <div className="flex justify-between items-baseline border-b border-dashed border-outline-variant pb-4">
            <span className="label-caps text-on-surface-variant/60">
              流派 / SCHOOL
            </span>
            <span className="font-semibold text-[#162839] text-lg">
              {school}
            </span>
          </div>
          <div className="flex justify-between items-baseline border-b border-dashed border-outline-variant pb-4">
            <span className="label-caps text-on-surface-variant/60">
              含量 / CONTENT
            </span>
            <span
              className="font-metric text-[48px] md:text-[56px] leading-none"
              style={{ color: pctColor, fontWeight: 600 }}
            >
              {animatedPct}%
            </span>
          </div>
          <div className="flex justify-between items-baseline border-b border-dashed border-outline-variant pb-4">
            <span className="label-caps text-on-surface-variant/60">
              段位 / RANK
            </span>
            <span className="font-semibold text-[#162839] text-lg">
              {rank.name}
              <span className="text-sm font-normal text-on-surface-variant ml-2">
                {rank.desc}
              </span>
            </span>
          </div>

          <div className="py-5">
            <p className="text-center font-serif-quote text-on-surface-variant leading-relaxed text-[15px]">
              &ldquo;{result.verdict}&rdquo;
            </p>
          </div>
        </div>

        {/* 底部：日期 + 印章 */}
        <div className="mt-10 flex justify-between items-end">
          <div>
            <div className="label-caps text-outline mb-1">颁发日期</div>
            <div className="font-semibold text-[#162839] text-sm">
              {new Date().toLocaleDateString("zh-CN")}
            </div>
          </div>

          {/* 新印章：Canvas 外圈 + 内圈橡皮章 */}
          <div className="relative w-[120px] h-[120px]">
            <StampRing pct={pct} />
            {/* 内圈：橡皮章 - 居中定位与动画分离，避免transform覆盖 */}
            {stampVisible && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="stamp-pop -rotate-[8deg]">
                  <div className="w-[78px] h-[78px] rounded-full border-[2.5px] border-dashed border-[#c0392b] flex flex-col items-center justify-center stamp-inner-breathe">
                    <span className="text-[22px] leading-none text-[#c0392b] -mt-0.5">
                      ✓
                    </span>
                    <span className="text-[11px] font-medium text-[#c0392b] leading-none tracking-[0.04em]">
                      已核准
                    </span>
                    <span className="text-[7.5px] text-[#c0392b] tracking-[0.12em] opacity-75 leading-none">
                      CERTIFIED
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 py-4">
        <button
          className="px-4 py-3 border-[1.5px] border-primary text-[13px] font-semibold btn-press bg-surface hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
          onClick={onRetry}
        >
          重新审计
        </button>
        <button
          className="px-4 py-3 bg-primary text-on-primary border-[1.5px] border-primary text-[13px] font-semibold neo-shadow-sm btn-press flex items-center justify-center gap-2"
          onClick={handleCopyText}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
          </svg>
          复制报告
        </button>
        <button
          className="px-4 py-3 bg-primary text-on-primary border-[1.5px] border-primary text-[13px] font-semibold neo-shadow-sm btn-press flex items-center justify-center gap-2"
          onClick={handleCopyImage}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
          </svg>
          复制检测卡
        </button>
        <button
          className="px-4 py-3 bg-surface-container-low border-[1.5px] border-primary text-[13px] font-semibold btn-press flex items-center justify-center gap-2"
          onClick={handleDownloadImage}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          下载证书
        </button>
      </div>

      {/* Hooks */}
      <div className="mt-6 pt-4 border-t border-outline-variant/50">
        <div className="grid grid-cols-3 gap-2.5">
          <a
            href="https://xingxing.starfluxes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hook-card group block border border-outline-variant/60 rounded-lg px-3 py-2.5 hover:border-[#7c6fcf]/40 hover:bg-surface-container-low transition-all"
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c6fcf] inline-block" />
              <span className="text-[11px] font-medium text-primary">
                醒醒
              </span>
            </div>
            <div className="text-[10px] text-on-surface-variant leading-[1.45] mb-2">
              还想知道为什么你总说废话？去醒醒，让她帮你想清楚。
            </div>
            <div className="text-[10px] text-on-surface/40 pt-1.5 border-t border-outline-variant/40 flex items-center gap-1 group-hover:text-on-surface transition-colors">
              去醒醒问她
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a
            href="https://su-shi.starfluxes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hook-card group block border border-outline-variant/60 rounded-lg px-3 py-2.5 hover:border-[#c4a45a]/40 hover:bg-surface-container-low transition-all"
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c4a45a] inline-block" />
              <span className="text-[11px] font-medium text-primary">
                行吟山河
              </span>
            </div>
            <div className="text-[10px] text-on-surface-variant leading-[1.45] mb-2">
              苏轼说话从不废话。看一个废话含量0%的人，一生去了哪里。
            </div>
            <div className="text-[10px] text-on-surface/40 pt-1.5 border-t border-outline-variant/40 flex items-center gap-1 group-hover:text-on-surface transition-colors">
              看他都去过哪里
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </a>
          <a
            href="https://weekends.starfluxes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hook-card group block border border-outline-variant/60 rounded-lg px-3 py-2.5 hover:border-[#3d9e6a]/40 hover:bg-surface-container-low transition-all"
          >
            <div className="flex items-center gap-1 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3d9e6a] inline-block" />
              <span className="text-[11px] font-medium text-primary">
                周末余额
              </span>
            </div>
            <div className="text-[10px] text-on-surface-variant leading-[1.45] mb-2">
              说了这么多废话，你还剩几个周末？别都用来说废话了。
            </div>
            <div className="text-[10px] text-on-surface/40 pt-1.5 border-t border-outline-variant/40 flex items-center gap-1 group-hover:text-on-surface transition-colors">
              快去算算余额
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>
      </div>

      {/* 微信浏览器图片预览弹窗 - 长按保存 */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="text-white text-center mb-4 text-sm">
            <p className="text-lg font-semibold mb-1">长按图片保存到相册</p>
            <p className="text-white/60 text-xs">点击空白区域关闭</p>
          </div>
          <img
            src={previewImage}
            alt="废话检测证书"
            className="max-w-full max-h-[70vh] rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
