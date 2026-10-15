import { describe, expect, it } from "vitest";
import { EdgeKind, parseArchitecture } from "@/model/architecture";
import { represent, scopeOf, viewOf } from "@/model/views";

const source = parseArchitecture({
  "architecture.json": JSON.stringify({
    title: "t",
    domains: [
      { id: "a", title: "领域 A", category: "DOMAIN_CATEGORY_CORE" },
      { id: "b", title: "领域 B", category: "DOMAIN_CATEGORY_CORE" },
    ],
    nodes: [
      { id: "user", kind: "NODE_KIND_EXTERNAL", title: "用户" },
      { id: "cluster", kind: "NODE_KIND_CLUSTER", title: "集群", tier: 1 },
      { id: "ns-a", parent: "cluster", kind: "NODE_KIND_NAMESPACE", title: "a", domain: "a" },
      { id: "api", parent: "ns-a", kind: "NODE_KIND_COMPONENT", title: "api" },
      { id: "worker", parent: "ns-a", kind: "NODE_KIND_COMPONENT", title: "worker" },
      { id: "ns-b", parent: "cluster", kind: "NODE_KIND_NAMESPACE", title: "b", domain: "b" },
      { id: "db", parent: "ns-b", kind: "NODE_KIND_COMPONENT", title: "db" },
      { id: "queue", parent: "ns-b", kind: "NODE_KIND_COMPONENT", title: "queue" },
      { id: "device", kind: "NODE_KIND_EXTERNAL", title: "设备", tier: 2 },
    ],
    edges: [
      { source: "user", target: "api", kind: "EDGE_KIND_REQUEST", label: "HTTPS" },
      { source: "api", target: "worker", kind: "EDGE_KIND_REQUEST" },
      { source: "api", target: "db", kind: "EDGE_KIND_REQUEST", label: "SQL" },
      { source: "worker", target: "db", kind: "EDGE_KIND_REQUEST" },
      { source: "worker", target: "queue", kind: "EDGE_KIND_EVENT" },
      { source: "worker", target: "device", kind: "EDGE_KIND_SOUTHBOUND" },
    ],
  }),
});

describe("domain overview", () => {
  const view = viewOf(source, "");

  it("collapses every domain into a box and keeps externals", () => {
    expect([...view.model.nodes.keys()]).toEqual([
      "overview/external-north",
      "overview/core",
      "overview/external-south",
      "user",
      "a",
      "b",
      "device",
    ]);
    expect(view.model.nodes.get("a")).toMatchObject({ title: "领域 A", parent: "overview/core" });
    expect(view.model.nodes.get("overview/core")).toMatchObject({ title: "核心领域", tier: 1 });
    expect(view.model.nodes.get("user")?.parent).toBe("overview/external-north");
    expect(view.model.nodes.get("device")?.parent).toBe("overview/external-south");
    expect(source.nodes.get("user")?.parent).toBe("");
  });

  it("merges connections per domain pair with the strongest kind", () => {
    expect([...view.model.edges.keys()]).toEqual(["user->a", "a->b", "a->device"]);
    expect(view.model.edges.get("a->b")).toMatchObject({
      kind: EdgeKind.REQUEST,
      label: "db · queue",
    });
    expect(view.model.edges.get("user->a")?.label).toBe("HTTPS");
    expect(view.bundles.get("a->b")).toEqual(["api->db", "worker->db", "worker->queue"]);
    expect(view.bundleOf.get("worker->queue")).toBe("a->b");
  });
});

describe("domain view", () => {
  const view = viewOf(source, "a");

  it("expands the domain with its containers and collapses neighbours", () => {
    expect([...view.model.nodes.keys()]).toEqual([
      "user",
      "cluster",
      "ns-a",
      "api",
      "worker",
      "b",
      "device",
    ]);
    expect(view.model.children.get("cluster")?.map((node) => node.id)).toEqual(["ns-a"]);
    expect(represent(view, "queue")).toBe("b");
    expect(represent(view, "worker")).toBe("worker");
  });

  it("keeps raw edges and merges same-kind edges into a neighbour box", () => {
    expect([...view.model.edges.keys()]).toEqual([
      "user->api",
      "api->worker",
      "api->b:REQUEST",
      "worker->b:REQUEST",
      "worker->b:EVENT",
      "worker->device",
    ]);
    expect(view.model.edges.get("api->b:REQUEST")?.label).toBe("SQL");
    expect(view.model.edges.get("api->worker")).toBe(source.edges.get("api->worker"));
  });

  it("is cached per scope and falls back to the overview", () => {
    expect(viewOf(source, "a")).toBe(view);
    expect(viewOf(source, "nope")).toBe(viewOf(source, ""));
  });
});

describe("scopeOf", () => {
  it.each([
    ["db", "b"],
    ["ns-a", "a"],
    ["b", "b"],
    ["user", ""],
    ["cluster", ""],
  ])("places %s in %j", (id, scope) => {
    expect(scopeOf(source, id)).toBe(scope);
  });
});

describe("architecture without domains", () => {
  it("has a single view equal to the source", () => {
    const plain = parseArchitecture({
      "architecture.json": JSON.stringify({
        title: "t",
        nodes: [
          { id: "a", kind: "NODE_KIND_COMPONENT", title: "a" },
          { id: "b", kind: "NODE_KIND_COMPONENT", title: "b" },
        ],
        edges: [{ source: "a", target: "b", kind: "EDGE_KIND_REQUEST" }],
      }),
    });
    const view = viewOf(plain, "");
    expect([...view.model.nodes.keys()]).toEqual(["a", "b"]);
    expect([...view.model.edges.keys()]).toEqual(["a->b"]);
  });
});
