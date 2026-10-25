import { create } from "@bufbuild/protobuf";
import { describe, expect, it } from "vitest";
import { RepositorySchema } from "@/gen/arch/v1/architecture_pb";
import {
  ancestors,
  Change,
  domainLeaves,
  EdgeKind,
  leavesOf,
  noteLeaves,
  parseArchitecture,
  sourceUrl,
} from "@/model/architecture";

const repositories = [
  { id: "app", url: "https://git.example/app", branch: "dev", summary: "应用" },
  { id: "planned", summary: "规划中的仓库" },
];
const nodes = [
  { id: "cluster", kind: "NODE_KIND_CLUSTER", title: "集群" },
  { id: "ns", parent: "cluster", kind: "NODE_KIND_NAMESPACE", title: "命名空间" },
  { id: "api", parent: "ns", kind: "NODE_KIND_COMPONENT", title: "api", repository: "app" },
  { id: "db", parent: "ns", kind: "NODE_KIND_COMPONENT", title: "db", change: "CHANGE_ADDED" },
  { id: "user", kind: "NODE_KIND_EXTERNAL", title: "用户" },
];
const edges = [
  { source: "user", target: "api", kind: "EDGE_KIND_REQUEST" },
  { source: "api", target: "db", kind: "EDGE_KIND_EVENT" },
];
const notes = [{ title: "要点", description: "说明", nodes: ["ns", "user"] }];

function parse(patch: Record<string, unknown>) {
  return parseArchitecture({
    "architecture.json": JSON.stringify({
      title: "t",
      repositories,
      nodes,
      edges,
      notes,
      ...patch,
    }),
  });
}

describe("parseArchitecture", () => {
  it("indexes containment and repositories", () => {
    const model = parse({});
    expect(leavesOf(model, "cluster")).toEqual(["api", "db"]);
    expect(ancestors(model, "api").map((node) => node.id)).toEqual(["cluster", "ns"]);
    const repository = model.repositories.get("app");
    expect(repository && sourceUrl(repository, "server")).toBe(
      "https://git.example/app/-/tree/dev/server",
    );
    const planned = model.repositories.get("planned");
    expect(planned && sourceUrl(planned, "server")).toBe("");
    const hub = { ...repositories[0], url: "https://github.com/org/app" };
    expect(sourceUrl(create(RepositorySchema, hub), "server")).toBe(
      "https://github.com/org/app/tree/dev/server",
    );
  });

  it("parses changes, event edges and notes", () => {
    const model = parse({});
    expect(model.nodes.get("db")?.change).toBe(Change.ADDED);
    expect(model.edges.get("api->db")?.kind).toBe(EdgeKind.EVENT);
    expect(noteLeaves(model, model.notes[0])).toEqual(["api", "db", "user"]);
  });

  it("assigns leaves to the domain declared on their container", () => {
    const model = parse({
      domains: [{ id: "app", title: "应用", category: "DOMAIN_CATEGORY_CORE" }],
      nodes: nodes.map((node) => (node.id === "ns" ? { ...node, domain: "app" } : node)),
    });
    expect(domainLeaves(model, "app")).toEqual(["api", "db"]);
    expect(model.domainOf.has("user")).toBe(false);
  });

  it("includes assigned external devices while leaving other externals unassigned", () => {
    const model = parse({
      domains: [{ id: "app", title: "应用", category: "DOMAIN_CATEGORY_CORE" }],
      nodes: [
        ...nodes.map((node) => (node.id === "ns" ? { ...node, domain: "app" } : node)),
        { id: "equipment", kind: "NODE_KIND_GROUP", title: "设备", domain: "app" },
        { id: "device", parent: "equipment", kind: "NODE_KIND_EXTERNAL", title: "主机" },
      ],
    });
    expect(domainLeaves(model, "app")).toEqual(["api", "db", "device"]);
    expect(model.domainOf.has("user")).toBe(false);
  });

  it("rejects unknown fields and enum values", () => {
    expect(() => parse({ owner: "x" })).toThrow();
    expect(() => parse({ edges: [{ source: "user", target: "api", kind: "CALL" }] })).toThrow();
  });

  it.each([
    ["duplicate node", { nodes: [...nodes, nodes[2]] }, "节点 api 重复"],
    [
      "unknown parent",
      { nodes: [...nodes, { id: "x", parent: "api", kind: "NODE_KIND_COMPONENT" }] },
      "不是容器节点",
    ],
    [
      "empty container",
      { nodes: [...nodes, { id: "g", kind: "NODE_KIND_GROUP" }] },
      "子节点与 kind 不一致",
    ],
    [
      "unknown repository",
      { nodes: [...nodes, { id: "x", kind: "NODE_KIND_EXTERNAL", repository: "nope" }] },
      "未知仓库",
    ],
    [
      "edge to container",
      { edges: [{ source: "user", target: "ns", kind: "EDGE_KIND_REQUEST" }] },
      "不是叶子节点",
    ],
    ["duplicate edge", { edges: [...edges, edges[0]] }, "连线 user->api 重复"],
    ["missing edge kind", { edges: [{ source: "user", target: "api" }] }, "缺少 kind"],
    ["unknown note node", { notes: [{ title: "n", nodes: ["nope"] }] }, "引用未知节点 nope"],
    ["empty note", { notes: [{ title: "n" }] }, "缺少标题或节点"],
    [
      "nested tier",
      { nodes: [...nodes, { id: "x", parent: "ns", kind: "NODE_KIND_COMPONENT", tier: 1 }] },
      "不能设置 tier",
    ],
    [
      "parent cycle",
      {
        nodes: [
          { id: "a", parent: "b", kind: "NODE_KIND_GROUP" },
          { id: "b", parent: "a", kind: "NODE_KIND_GROUP" },
        ],
        edges: [],
      },
      "存在环",
    ],
  ])("rejects %s", (_, patch, message) => {
    expect(() => parse(patch)).toThrow(message);
  });

  const domains = [{ id: "app", title: "应用", category: "DOMAIN_CATEGORY_CORE" }];
  const assigned = (overrides: Record<string, string>) =>
    nodes.map((node) => (node.id in overrides ? { ...node, domain: overrides[node.id] } : node));
  it.each([
    ["unknown domain", { nodes: assigned({ ns: "nope" }) }, "引用未知领域 nope"],
    [
      "duplicate domain",
      { domains: [...domains, ...domains], nodes: assigned({ ns: "app" }) },
      "领域 app 重复",
    ],
    [
      "domain named like a node",
      {
        domains: [{ id: "api", title: "x", category: "DOMAIN_CATEGORY_CORE" }],
        nodes: assigned({ api: "api", db: "api" }),
      },
      "与节点 ID 重复",
    ],
    ["nested domain", { domains, nodes: assigned({ ns: "app", api: "app" }) }, "重复声明领域"],
    ["unassigned component", { domains, nodes: assigned({ api: "app" }) }, "节点 db 未归属领域"],
    [
      "uncategorized domain",
      { domains: [{ id: "app", title: "应用" }], nodes: assigned({ ns: "app" }) },
      "领域 app 缺少分类",
    ],
    [
      "empty domain",
      {
        domains: [...domains, { id: "idle", title: "空", category: "DOMAIN_CATEGORY_CORE" }],
        nodes: assigned({ ns: "app" }),
      },
      "领域 idle 没有节点",
    ],
  ])("rejects %s", (_, patch, message) => {
    expect(() => parse(patch)).toThrow(message);
  });
});

describe("parseArchitecture fragments", () => {
  const [cluster, ns, api, db, user] = nodes;
  const fragment = (value: Record<string, unknown>) => JSON.stringify(value);

  it("merges fragments in path order, appending repeated fields", () => {
    const model = parseArchitecture({
      "domains/app.json": fragment({ nodes: [api, db], edges: [edges[1]] }),
      "architecture.json": fragment({
        title: "t",
        repositories,
        nodes: [cluster, ns, user],
        edges: [edges[0]],
      }),
    });
    expect(model.title).toBe("t");
    expect([...model.nodes.keys()]).toEqual(["cluster", "ns", "user", "api", "db"]);
    expect([...model.edges.keys()]).toEqual(["user->api", "api->db"]);
    expect(leavesOf(model, "cluster")).toEqual(["api", "db"]);
  });

  it("validates references across fragments", () => {
    const fragments = {
      "a.json": fragment({ title: "t", nodes, edges }),
      "b.json": fragment({
        edges: [{ source: "user", target: "nope", kind: "EDGE_KIND_REQUEST" }],
      }),
    };
    expect(() => parseArchitecture(fragments)).toThrow("端点 nope 不是叶子节点");
  });

  it.each([
    [
      "an invalid fragment by path",
      { "a.json": fragment({ title: "t", nodes }), "b.json": fragment({ owner: "x" }) },
      "b.json",
    ],
    [
      "a title declared twice",
      { "a.json": fragment({ title: "t", nodes }), "b.json": fragment({ title: "u" }) },
      "标题在 a.json 与 b.json 中重复声明",
    ],
    [
      "a baseline declared twice",
      { "a.json": fragment({ baseline: "x", nodes }), "b.json": fragment({ baseline: "y" }) },
      "基线在 a.json 与 b.json 中重复声明",
    ],
    ["a diagram without fragments", {}, "没有架构图片段"],
  ])("rejects %s", (_, fragments, message) => {
    expect(() => parseArchitecture(fragments)).toThrow(message);
  });
});
