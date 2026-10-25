// @vitest-environment jsdom
// Mermaid 的语法解析依赖 DOMPurify，需要 DOM 环境。
import mermaid from "mermaid";
import { describe, expect, it } from "vitest";
import { EXPLAINERS } from "@/model/diagrams";
import { parseExplainer } from "@/model/explainer";

// 通用校验，作用于 ARCH_DATA 选择的数据。
describe.each(EXPLAINERS)("$id explainer data", ({ manifests, sources }) => {
  const explainer = parseExplainer(manifests, sources);

  it.each(explainer.figures)("parses $id as Mermaid", async ({ code }) => {
    await expect(mermaid.parse(code)).resolves.toBeTruthy();
  });
});

describe("parseExplainer", () => {
  const manifest = (figures: object[], extra: object = {}) => ({
    "/d/flow/explainer.json": JSON.stringify({ title: "流程", figures, ...extra }),
  });
  const figure = (source: string, title = "图") => ({ title, source });

  it("keeps the declared order and derives figure IDs from file names", () => {
    const model = parseExplainer(manifest([figure("b.mmd", "乙"), figure("a.mmd", "甲")]), {
      "a.mmd": "A",
      "b.mmd": "B",
    });
    expect(model.title).toBe("流程");
    expect(model.figures.map(({ id, title, code }) => [id, title, code])).toEqual([
      ["b", "乙", "B"],
      ["a", "甲", "A"],
    ]);
  });

  it("references every source exactly once", () => {
    expect(() =>
      parseExplainer(manifest([figure("a.mmd"), figure("a.mmd"), figure("c.mmd")]), {
        "a.mmd": "",
        "b.mmd": "",
      }),
    ).toThrow("a.mmd 被重复引用；引用的 c.mmd 不存在；b.mmd 未被清单引用");
  });

  it("requires figure titles", () => {
    expect(() => parseExplainer(manifest([figure("a.mmd", "")]), { "a.mmd": "" })).toThrow(
      "a.mmd 缺少标题",
    );
  });

  it("requires exactly one strictly parsed manifest", () => {
    expect(() => parseExplainer({}, { "a.mmd": "" })).toThrow("恰有一个清单，实际为 0 个");
    expect(() =>
      parseExplainer(manifest([figure("a.mmd")], { nodes: [] }), { "a.mmd": "" }),
    ).toThrow("/d/flow/explainer.json");
  });
});
