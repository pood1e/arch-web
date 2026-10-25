import type { MermaidConfig } from "mermaid";

type Mermaid = typeof import("mermaid")["default"];

/** 单张图的渲染结果：SVG 或错误信息。 */
export type Rendered = { svg: string; error?: undefined } | { svg?: undefined; error: string };

let loading: Promise<Mermaid> | undefined;
let sequence = 0;

/**
 * 以站点当前配色依次渲染一组 Mermaid 源码。Mermaid 在首次调用时才加载，其他页面不承担其体积；
 * 配置是全局的，同一批次只初始化一次。
 */
export async function renderMermaid(codes: string[], theme: "light" | "dark"): Promise<Rendered[]> {
  loading ??= import("mermaid").then((module) => module.default);
  const [mermaid] = await Promise.all([loading, document.fonts.ready]);
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: palette(theme),
  });
  const results: Rendered[] = [];
  for (const code of codes) {
    try {
      const { svg } = await mermaid.render(`mermaid-${++sequence}`, code);
      results.push({ svg });
    } catch (error) {
      results.push({ error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

/** 图表数据系列依次使用的颜色变量，两种主题下都与卡片底色有足够对比度。 */
const SERIES = ["primary", "info", "success", "violet", "warning", "ring", "muted-foreground"];

/** 由根元素的 CSS 变量映射 Mermaid base 主题；该主题只识别十六进制颜色。 */
function palette(theme: "light" | "dark"): MermaidConfig["themeVariables"] {
  const style = getComputedStyle(document.documentElement);
  const color = (name: string) => style.getPropertyValue(`--${name}`).trim();
  const series = SERIES.map(color);
  return {
    darkMode: theme === "dark",
    fontFamily: style.fontFamily,
    fontSize: "13px",
    background: color("card"),
    primaryColor: color("accent"),
    primaryTextColor: color("foreground"),
    primaryBorderColor: color("ring"),
    secondaryColor: color("surface"),
    tertiaryColor: color("muted"),
    lineColor: color("muted-foreground"),
    edgeLabelBackground: color("card"),
    textColor: color("foreground"),
    noteBkgColor: color("muted"),
    noteTextColor: color("foreground"),
    noteBorderColor: color("border"),
    gridColor: color("border"),
    sectionBkgColor: color("muted"),
    sectionBkgColor2: color("muted"),
    altSectionBkgColor: color("card"),
    taskTextOutsideColor: color("foreground"),
    // 甘特图关键任务与普通任务共用文字颜色，填充取主色与卡片色的中间色以保证两种主题下的对比度。
    critBkgColor: mix(color("primary"), color("card"), 0.45),
    critBorderColor: color("primary"),
    ...Object.fromEntries(series.map((value, index) => [`pie${index + 1}`, value])),
    pieOpacity: "1",
    pieTitleTextSize: "15px",
    pieSectionTextSize: "13px",
    pieLegendTextSize: "13px",
    pieStrokeColor: color("card"),
    pieOuterStrokeColor: color("border"),
    pieSectionTextColor: color("card"),
    pieLegendTextColor: color("foreground"),
    pieTitleTextColor: color("foreground"),
    xyChart: {
      backgroundColor: color("card"),
      titleColor: color("foreground"),
      legendTextColor: color("foreground"),
      dataLabelColor: color("foreground"),
      xAxisTitleColor: color("muted-foreground"),
      xAxisLabelColor: color("muted-foreground"),
      xAxisTickColor: color("border"),
      xAxisLineColor: color("border"),
      yAxisTitleColor: color("muted-foreground"),
      yAxisLabelColor: color("muted-foreground"),
      yAxisTickColor: color("border"),
      yAxisLineColor: color("border"),
      plotColorPalette: series.join(","),
    },
  };
}

function mix(from: string, to: string, weight: number): string {
  const channels = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const target = channels(to);
  const mixed = channels(from).map((value, i) =>
    Math.round(value * weight + target[i] * (1 - weight)),
  );
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}
