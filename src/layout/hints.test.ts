import { describe, expect, it } from "vitest";
import { layoutHints } from "@/layout/hints";
import { parseArchitecture } from "@/model/architecture";
import { viewOf } from "@/model/views";

const source = parseArchitecture(
  JSON.stringify({
    title: "t",
    domains: [
      { id: "a", title: "领域 A", category: "DOMAIN_CATEGORY_CORE" },
      { id: "b", title: "领域 B", category: "DOMAIN_CATEGORY_CORE" },
      { id: "c", title: "领域 C", category: "DOMAIN_CATEGORY_OPTIONAL" },
    ],
    nodes: [
      { id: "user", kind: "NODE_KIND_EXTERNAL", title: "用户" },
      { id: "cluster", kind: "NODE_KIND_CLUSTER", title: "集群", tier: 1 },
      { id: "ns-a", parent: "cluster", kind: "NODE_KIND_NAMESPACE", title: "a", domain: "a" },
      { id: "api", parent: "ns-a", kind: "NODE_KIND_COMPONENT", title: "api" },
      { id: "worker", parent: "ns-a", kind: "NODE_KIND_COMPONENT", title: "worker" },
      { id: "ns-b", parent: "cluster", kind: "NODE_KIND_NAMESPACE", title: "b", domain: "b" },
      { id: "db", parent: "ns-b", kind: "NODE_KIND_COMPONENT", title: "db" },
      { id: "bus", parent: "ns-b", kind: "NODE_KIND_COMPONENT", title: "bus" },
      { id: "ns-c", parent: "cluster", kind: "NODE_KIND_NAMESPACE", title: "c", domain: "c" },
      { id: "peer", parent: "ns-c", kind: "NODE_KIND_COMPONENT", title: "peer" },
      { id: "device", kind: "NODE_KIND_EXTERNAL", title: "设备", tier: 3 },
    ],
    edges: [
      { source: "user", target: "api", kind: "EDGE_KIND_REQUEST" },
      { source: "api", target: "db", kind: "EDGE_KIND_REQUEST" },
      { source: "worker", target: "db", kind: "EDGE_KIND_REQUEST" },
      { source: "worker", target: "bus", kind: "EDGE_KIND_EVENT" },
      { source: "peer", target: "api", kind: "EDGE_KIND_REQUEST" },
      { source: "worker", target: "peer", kind: "EDGE_KIND_REQUEST" },
      { source: "worker", target: "device", kind: "EDGE_KIND_SOUTHBOUND" },
    ],
  }),
);

describe("layoutHints", () => {
  it("weights merged connections by their calls only", () => {
    const { callWeights } = layoutHints(viewOf(source, ""));
    expect(callWeights.get("a->b")).toBe(2);
    expect(callWeights.get("a->device")).toBe(1);
    expect(layoutHints(viewOf(source, "a")).callWeights.get("worker->b:EVENT")).toBe(0);
  });

  it("partitions overview groups by their tiers", () => {
    const { partitions } = layoutHints(viewOf(source, ""));
    expect(Object.fromEntries(partitions)).toEqual({
      "overview/external-north": 0,
      "overview/core": 1,
      "overview/optional": 1,
      "overview/external-south": 3,
    });
  });

  it("places callers above and callees below the focused domain", () => {
    const { partitions } = layoutHints(viewOf(source, "a"));
    const order = (id: string) => partitions.get(id) ?? Number.NaN;
    expect(order("user")).toBeLessThan(order("cluster"));
    expect(order("c")).toBeLessThan(order("cluster"));
    expect(order("b")).toBeGreaterThan(order("cluster"));
    expect(order("device")).toBeGreaterThan(order("cluster"));
  });

  it("skips partitions for diagrams without tiers", () => {
    const plain = parseArchitecture(
      JSON.stringify({
        title: "t",
        nodes: [
          { id: "x", kind: "NODE_KIND_COMPONENT", title: "x" },
          { id: "y", kind: "NODE_KIND_COMPONENT", title: "y" },
        ],
        edges: [{ source: "x", target: "y", kind: "EDGE_KIND_REQUEST" }],
      }),
    );
    expect(layoutHints(viewOf(plain, "")).partitions.size).toBe(0);
  });
});
