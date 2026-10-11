import { describe, expect, it } from "vitest";
import { focusHighlight, matchesQuery } from "@/graph/highlight";
import { parseArchitecture } from "@/model/architecture";
import { viewOf } from "@/model/views";

const source = parseArchitecture(
  JSON.stringify({
    title: "t",
    repositories: [{ id: "repo" }],
    domains: [
      { id: "a", title: "领域 A", category: "DOMAIN_CATEGORY_CORE" },
      { id: "b", title: "领域 B", category: "DOMAIN_CATEGORY_CORE" },
    ],
    nodes: [
      { id: "api", kind: "NODE_KIND_COMPONENT", title: "api", repository: "repo", domain: "a" },
      { id: "db", kind: "NODE_KIND_COMPONENT", title: "PostgreSQL", domain: "b" },
      { id: "cache", kind: "NODE_KIND_COMPONENT", title: "Valkey", domain: "b" },
    ],
    edges: [
      { source: "api", target: "db", kind: "EDGE_KIND_REQUEST" },
      { source: "api", target: "cache", kind: "EDGE_KIND_REQUEST" },
    ],
    notes: [{ title: "n", nodes: ["db"] }],
  }),
);

describe("focusHighlight in views", () => {
  it("projects notes and repositories onto domain boxes", () => {
    const overview = viewOf(source, "");
    expect(focusHighlight(overview, { type: "note", id: "0" })?.nodes).toEqual(new Set(["b"]));
    expect(focusHighlight(overview, { type: "repository", id: "repo" })?.nodes).toEqual(
      new Set(["a"]),
    );
  });

  it("highlights the merged edge of a raw edge", () => {
    const view = viewOf(source, "a");
    expect(focusHighlight(view, { type: "edge", id: "api->cache" })?.edges).toEqual(
      new Set(["api->b:REQUEST"]),
    );
  });
});

describe("matchesQuery", () => {
  it("matches a domain box by its components", () => {
    const overview = viewOf(source, "");
    expect(matchesQuery(overview, "b", "valkey")).toBe(true);
    expect(matchesQuery(overview, "a", "valkey")).toBe(false);
  });
});
