"use client";

import { useEffect, useState } from "react";

const LOADING_STEPS = [
  "词汇扫描与词库比对中",
  "提取官僚流派特征中",
  "计算信息熵增含量中",
];

interface LoadingScreenProps {
  onDone: () => void;
}

export default function LoadingScreen({ onDone: _onDone }: LoadingScreenProps) {
  const [activeStep, setActiveStep] = useState(-1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let stepIdx = 0;
    let pct = 0;
    let lastUpdate = 0;

    const stepInterval = setInterval(() => {
      if (stepIdx < LOADING_STEPS.length) {
        setActiveStep(stepIdx);
        stepIdx++;
      }
    }, 700);

    const progressInterval = setInterval(() => {
      // 90% 以下快速推进，90% 以上减速等待 API 返回
      const increment = pct < 90 ? Math.random() * 12 : Math.random() * 1.5;
      pct += increment;
      if (pct >= 98) {
        pct = 98; // 卡在 98%，等 API 返回后由 page.tsx 切换屏幕
      }
      // 节流 DOM 更新：每 100ms 最多更新一次
      const now = Date.now();
      if (now - lastUpdate >= 100) {
        lastUpdate = now;
        setProgress(pct);
      }
    }, 300);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-surface flex flex-col items-center justify-center p-margin">
      {/* Scanner Box */}
      <div className="w-full max-w-[300px] aspect-square border-[1.5px] border-primary bg-surface-container-low relative overflow-hidden neo-shadow flex flex-col items-center justify-center gap-4">
        <div className="scan-line" />
        <svg
          className="w-16 h-16 text-primary animate-bounce"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6zm0 4h8v2H6zm10 0h2v2h-2zm-6-4h8v2h-8z"/>
        </svg>
        <div className="text-center px-4 w-full">
          <p className="label-caps text-primary mb-2">
            {activeStep >= 0 && activeStep < LOADING_STEPS.length
              ? LOADING_STEPS[Math.min(activeStep, LOADING_STEPS.length - 1)]
              : "正在进行语言完整性校验..."}
          </p>
          <div className="w-full bg-surface-container-lowest border-[1.5px] border-primary h-4">
            <div
              className="bg-primary h-full transition-all duration-300 progress-stripe"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Steps List */}
      <div className="mt-lg flex flex-col items-center gap-2">
        {LOADING_STEPS.map((step, i) => (
          <span
            key={i}
            className={`label-caps transition-all duration-300 ${
              i < activeStep
                ? "text-primary font-bold"
                : i === activeStep
                ? "text-primary font-bold"
                : "text-outline opacity-30"
            }`}
          >
            {i < activeStep ? "✓ " : i === activeStep ? "→ " : ""}
            {step}
          </span>
        ))}
      </div>

      {/* Quote */}
      <p className="mt-lg font-serif-quote text-outline text-center px-8 text-lg">
        &ldquo;每一句废话，都是对地球氧气的二次浪费。&rdquo;
      </p>
    </div>
  );
}
