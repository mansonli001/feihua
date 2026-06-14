// 流派配色系统
export interface SchoolTheme {
  bg: string;
  border: string;
  text: string;
  tagBg: string;
  tagText: string;
  barColor: string;
}

export const SCHOOL_MAP: Record<string, SchoolTheme> = {
  职场太极宗: {
    bg: "#f3f0ff", border: "#dcd7ff", text: "#3b368c",
    tagBg: "#e8e4ff", tagText: "#26215c", barColor: "#7f77dd",
  },
  小红书虚空派: {
    bg: "#fff0f6", border: "#ffd6e7", text: "#852445",
    tagBg: "#ffe0ec", tagText: "#4b1528", barColor: "#d4537e",
  },
  深夜emo哲学系: {
    bg: "#e6f4ff", border: "#bae0ff", text: "#003a8c",
    tagBg: "#d4edff", tagText: "#042c53", barColor: "#378add",
  },
  正能量传销体: {
    bg: "#fff7e6", border: "#ffe7ba", text: "#874d00",
    tagBg: "#fff1cc", tagText: "#412402", barColor: "#ba7517",
  },
  互联网黑话宗: {
    bg: "#f6ffed", border: "#d9f7be", text: "#237804",
    tagBg: "#eaffdb", tagText: "#173404", barColor: "#639922",
  },
  向上管理体: {
    bg: "#fff7e6", border: "#ffe7ba", text: "#874d00",
    tagBg: "#fff1cc", tagText: "#412402", barColor: "#ba7517",
  },
  PPT造梦流: {
    bg: "#f3f0ff", border: "#dcd7ff", text: "#3b368c",
    tagBg: "#e8e4ff", tagText: "#26215c", barColor: "#7f77dd",
  },
  会议僵尸派: {
    bg: "#f5f5f5", border: "#d9d9d9", text: "#262626",
    tagBg: "#ececec", tagText: "#2c2c2a", barColor: "#888780",
  },
  相亲客套流: {
    bg: "#fff0f6", border: "#ffd6e7", text: "#852445",
    tagBg: "#ffe0ec", tagText: "#4b1528", barColor: "#d4537e",
  },
  学术绕圈门: {
    bg: "#e6f4ff", border: "#bae0ff", text: "#003a8c",
    tagBg: "#d4edff", tagText: "#042c53", barColor: "#378add",
  },
  道歉太极拳: {
    bg: "#fff1f0", border: "#ffccc7", text: "#a8071a",
    tagBg: "#ffddd9", tagText: "#501313", barColor: "#e24b4a",
  },
  催婚唠叨体: {
    bg: "#fff2e8", border: "#ffd8bf", text: "#873800",
    tagBg: "#ffe6d4", tagText: "#4a1b0c", barColor: "#d85a30",
  },
  群消息应付派: {
    bg: "#f5f5f5", border: "#d9d9d9", text: "#262626",
    tagBg: "#ececec", tagText: "#2c2c2a", barColor: "#888780",
  },
  朋友圈摄影文学派: {
    bg: "#e6f4ff", border: "#bae0ff", text: "#003a8c",
    tagBg: "#d4edff", tagText: "#042c53", barColor: "#378add",
  },
};

// 段位映射
export interface RankInfo {
  name: string;
  desc: string;
}

const RANK_TABLE: [number, number, string, string][] = [
  [0, 20, "废话学徒", "还算人话"],
  [20, 35, "废话初修", "小有心得"],
  [35, 50, "废话行家", "登堂入室"],
  [50, 65, "废话达人", "炉火纯青"],
  [65, 78, "废话宗师", "化废为道"],
  [78, 88, "废话大师", "废话成精"],
  [88, 95, "废话传说", "登峰造极"],
  [95, 101, "废话之神", "天人合一"],
];

export function getRank(pct: number): RankInfo {
  for (const [lo, hi, name, desc] of RANK_TABLE) {
    if (pct >= lo && pct < hi) return { name, desc };
  }
  return { name: "废话之神", desc: "天人合一" };
}

// 示例文本
export interface ExamplePill {
  label: string;
  text: string;
}

export const EXAMPLES: ExamplePill[] = [
  {
    label: "职场太极",
    text: "在当前复杂多变的市场环境下，我们需要结合实际情况，综合研判，稳步推进各项工作，确保整体战略目标的顺利达成，同时兼顾短期效益与长期发展的有机统一。",
  },
  {
    label: "小红书虚空",
    text: "姐妹们！！这个真的绝了！！超级无敌好用！！强烈推荐！！冲就对了！！买它买它买它！！",
  },
  {
    label: "深夜emo",
    text: "在这个信息爆炸的时代，我们究竟失去了什么？夜深了，窗外的雨还在下，我望着远处的灯光，突然觉得，人生也不过如此，来来去去，聚聚散散……",
  },
  {
    label: "正能量传销",
    text: "你只管努力，剩下的交给时间。种一棵树最好的时间是十年前，其次是现在。每一个努力的人，都值得被时代温柔以待。",
  },
  {
    label: "互联网黑话",
    text: "我们要快速对齐颗粒度，把MVP跑通之后赋能前端团队，打造全链路闭环生态，实现用户价值与商业价值的双向奔赴。",
  },
  {
    label: "相亲客套",
    text: "哈哈是嘛，你也挺有意思的，以后可以多聊多交流，互相学习嘛，你觉得呢？哈哈哈",
  },
];

// AI 返回结果类型
export interface DetectResult {
  pct: number;
  school: string;
  best_sentence: string;
  verdict: string;
}

// 生成审计编号（从 00001 递增，localStorage 持久化）
export function generateSerial(): string {
  if (typeof window === "undefined") return "BLR-2026-X00001";
  const KEY = "feihua_serial_counter";
  let counter = parseInt(localStorage.getItem(KEY) || "0", 10);
  counter += 1;
  localStorage.setItem(KEY, counter.toString());
  return `BLR-2026-X${counter.toString().padStart(5, "0")}`;
}
