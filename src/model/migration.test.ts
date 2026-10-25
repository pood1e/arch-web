import { describe, expect, it } from "vitest";
import { parseArchitecture } from "@/model/architecture";
import { parseMigration, stepOf } from "@/model/migration";

const baseline = parseArchitecture({
  "architecture.json": JSON.stringify({
    title: "现状",
    nodes: [
      { id: "legacy", kind: "NODE_KIND_COMPONENT" },
      { id: "shared", kind: "NODE_KIND_COMPONENT" },
      { id: "preserved", kind: "NODE_KIND_COMPONENT" },
    ],
  }),
});
const target = parseArchitecture({
  "architecture.json": JSON.stringify({
    title: "目标",
    nodes: [
      { id: "shared", kind: "NODE_KIND_COMPONENT", change: "CHANGE_REWORKED" },
      { id: "new", kind: "NODE_KIND_COMPONENT", change: "CHANGE_ADDED" },
      { id: "preserved", kind: "NODE_KIND_COMPONENT" },
      { id: "group", kind: "NODE_KIND_GROUP" },
      { id: "child", parent: "group", kind: "NODE_KIND_COMPONENT", change: "CHANGE_ADDED" },
    ],
  }),
});
const phases = [
  {
    title: "替换",
    description: "交付新组件",
    nodes: ["shared", "new"],
    retires: ["legacy"],
    exitCriteria: "旧组件下线",
  },
  {
    title: "扩展",
    description: "交付容器中的组件",
    nodes: ["group"],
    exitCriteria: "新能力就绪",
  },
];

const diagrams = new Map([
  ["before", baseline],
  ["after", target],
]);

function parse(patch: Record<string, unknown> = {}) {
  const json = JSON.stringify({
    title: "路线",
    phases,
    baseline: "before",
    target: "after",
    ...patch,
  });
  return parseMigration(json, (id) => diagrams.get(id));
}

describe("parseMigration", () => {
  it("indexes delivery and retirement across both architectures", () => {
    const model = parse();
    expect([model.baselineId, model.targetId]).toEqual(["before", "after"]);
    expect([...model.delivered]).toEqual([
      ["shared", 0],
      ["new", 0],
      ["child", 1],
    ]);
    expect([...model.retired]).toEqual([["legacy", 0]]);
    expect(stepOf(model, "baseline", "legacy")?.action).toBe("下线");
    expect(stepOf(model, "target", "new")?.action).toBe("新增");
    expect(stepOf(model, "baseline", "shared")?.index).toBe(0);
    expect(stepOf(model, "target", "preserved")).toBeUndefined();
  });

  it.each([
    [
      "unknown target",
      [{ ...phases[0], nodes: ["missing", "shared", "new"] }, phases[1]],
      "终点架构未知节点 missing",
    ],
    [
      "unchanged delivery",
      [{ ...phases[0], nodes: ["shared", "new", "preserved"] }, phases[1]],
      "交付未改动的节点 preserved",
    ],
    [
      "duplicate delivery",
      [phases[0], { ...phases[1], nodes: ["group", "child"] }],
      "节点 child 交付多次",
    ],
    [
      "missing delivery",
      [{ ...phases[0], nodes: ["shared"] }, phases[1]],
      "节点 new 未排入交付阶段",
    ],
    [
      "unknown baseline",
      [{ ...phases[0], retires: ["missing"] }, phases[1]],
      "下线的 missing 不是起点架构叶子节点",
    ],
    [
      "surviving baseline",
      [{ ...phases[0], retires: ["preserved", "legacy"] }, phases[1]],
      "下线的 preserved 仍在终点架构中",
    ],
    [
      "duplicate retirement",
      [phases[0], { ...phases[1], retires: ["legacy"] }],
      "节点 legacy 下线多次",
    ],
    [
      "missing retirement",
      [{ ...phases[0], retires: [] }, phases[1]],
      "起点节点 legacy 未排入下线阶段",
    ],
    [
      "missing criteria",
      [{ ...phases[0], exitCriteria: "" }, phases[1]],
      "缺少标题、目标、交付节点或完成标准",
    ],
  ])("rejects %s", (_, items, message) => {
    expect(() => parse({ phases: items })).toThrow(message);
  });

  it("rejects unknown fields", () => {
    expect(() => parse({ owner: "unknown" })).toThrow();
  });

  it("rejects endpoints that are not loaded diagrams", () => {
    expect(() => parse({ target: "missing" })).toThrow("终点「missing」");
    expect(() => parse({ baseline: "" })).toThrow("起点「」");
  });
});
