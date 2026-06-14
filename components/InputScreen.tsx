"use client";

import { useState } from "react";
import { EXAMPLES } from "@/lib/constants";

interface InputScreenProps {
  onDetect: (text: string) => void;
}

export default function InputScreen({ onDetect }: InputScreenProps) {
  const [text, setText] = useState("");
  const charLen = text.length;

  return (
    <section className="space-y-lg">
      {/* Hero */}
      <div className="text-center py-lg">
        <p className="label-caps text-outline mb-1">审计编号 № 886</p>
        <h1 className="text-[36px] md:text-[48px] font-bold text-primary leading-[1.15] tracking-[-0.02em] mb-sm">
          废话含量达标了吗？
        </h1>
        <p className="text-on-surface-variant text-[15px] leading-[1.6] tracking-[0.01em] max-w-[500px] mx-auto opacity-80">
          粘贴任意一段文字，我们帮你检测废话含量、认定流派、颁发证书；
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-surface-container-lowest border-[1.5px] border-primary p-6 md:p-8 neo-shadow relative">
        <div className="absolute -top-3 -right-2 bg-secondary-container border-[1.5px] border-primary px-2 py-0.5 z-10 label-caps text-[10px] rotate-3 neo-shadow-sm text-on-secondary-container">
          待审核文本
        </div>
        <div className="flex justify-between items-center mb-4">
          <span className="label-caps text-outline">待检测审计文本</span>
          <span className="label-caps text-outline">
            {charLen} / 500 字
          </span>
        </div>
        <textarea
          className="w-full h-56 bg-surface-container-low border-none focus:outline-none focus:ring-0 text-base resize-none p-4 text-on-surface leading-relaxed"
          value={text}
          onChange={(e) => {
            const v = e.target.value.slice(0, 500);
            setText(v);
          }}
          placeholder="把你老板的周报、领导的发言、相亲对象的消息、朋友圈文案……统统粘进来。"
        />
        <div className="mt-6 flex flex-col gap-4">
          {/* Example Pills */}
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                className="px-3 py-1 border-[1.5px] border-outline-variant rounded-full text-[11px] font-semibold tracking-[0.02em] text-on-surface-variant hover:bg-primary hover:text-on-primary hover:border-primary transition-all btn-press whitespace-nowrap"
                onClick={() => setText(ex.text)}
              >
                #{ex.label}
              </button>
            ))}
          </div>
          {/* Detect Button */}
          <button
            className="w-full px-10 py-4 bg-primary text-on-primary font-semibold text-[15px] tracking-[0.15em] neo-shadow-sm btn-press disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
            disabled={charLen < 10}
            onClick={() => onDetect(text)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h18v18H3V3zm2 2v14h14V5H5zm3 3h8v2H8V8zm0 4h6v2H8v-2z"/>
            </svg>
            开始官方审计
          </button>
        </div>
      </div>
    </section>
  );
}
