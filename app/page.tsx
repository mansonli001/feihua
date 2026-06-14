"use client";

import { useState, useCallback, useRef } from "react";
import InputScreen from "@/components/InputScreen";
import LoadingScreen from "@/components/LoadingScreen";
import ResultScreen from "@/components/ResultScreen";
import type { DetectResult } from "@/lib/constants";

type Screen = "input" | "loading" | "result";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("input");
  const [result, setResult] = useState<DetectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<DetectResult | null>(null);
  const loadingDoneRef = useRef(false);

  const tryShowResult = useCallback(() => {
    if (resultRef.current && loadingDoneRef.current) {
      setResult(resultRef.current);
      setScreen("result");
    }
  }, []);

  const handleDetect = useCallback(
    async (text: string) => {
      setError(null);
      setScreen("loading");
      resultRef.current = null;
      loadingDoneRef.current = false;

      try {
        const res = await fetch("/api/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        const data = await res.json();

        if (!data.ok) {
          throw new Error(data.error || "检测失败");
        }

        resultRef.current = data.result;
        tryShowResult();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "网络错误，请重试";
        setError(msg);
        setScreen("input");
      }
    },
    [tryShowResult]
  );

  const handleLoadingDone = useCallback(() => {
    loadingDoneRef.current = true;
    tryShowResult();
  }, [tryShowResult]);

  const handleRetry = useCallback(() => {
    setResult(null);
    setError(null);
    resultRef.current = null;
    loadingDoneRef.current = false;
    setScreen("input");
  }, []);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-[660px] mx-auto px-gutter py-margin">
        {/* Logo Bar */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary flex items-center justify-center">
              <svg
                className="text-on-primary"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h8v2H8V8zm0 4h6v2H8v-2z" />
              </svg>
            </div>
            <div>
              <div className="font-bold text-primary text-sm tracking-tight">
                废话检测局
              </div>
              <div className="label-caps text-[9px] text-outline tracking-widest">
                BUREAU OF LINGUISTIC REDUNDANCY
              </div>
            </div>
          </div>
          <div className="label-caps text-[9px] text-outline tracking-wider">
            EST. 2026
          </div>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-lg p-4 border-[1.5px] border-error bg-error-container/30 text-error text-sm">
            {error}
          </div>
        )}

        {/* Screens */}
        {screen === "input" && <InputScreen onDetect={handleDetect} />}
        {screen === "loading" && (
          <LoadingScreen onDone={handleLoadingDone} />
        )}
        {screen === "result" && result && (
          <ResultScreen result={result} onRetry={handleRetry} />
        )}

        {/* Footer */}
        <footer className="mt-xl pt-md border-t border-outline-variant text-center">
          <p className="label-caps text-outline text-[10px] tracking-wider">
            POWERED BY AI · 废话检测局 · 本结果仅供娱乐
          </p>
        </footer>
      </div>
    </main>
  );
}
