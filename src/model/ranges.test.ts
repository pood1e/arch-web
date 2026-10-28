import { describe, expect, it } from "vitest";
import { NodeKind, parseArchitecture } from "@/model/architecture";
import { represent, viewOf } from "@/model/views";

const definition = {
  title: "Shared deployment range",
  domains: [
    { id: "shared", title: "Shared", category: "DOMAIN_CATEGORY_CORE", expanded: true },
    { id: "app", title: "Application", category: "DOMAIN_CATEGORY_CORE" },
  ],
  nodes: [
    { id: "cluster", title: "Cluster", kind: "NODE_KIND_CLUSTER", tier: 1 },
    {
      id: "shared-root",
      title: "Shared",
      kind: "NODE_KIND_GROUP",
      parent: "cluster",
      domain: "shared",
    },
    {
      id: "controller",
      title: "Controller",
      kind: "NODE_KIND_COMPONENT",
      parent: "shared-root",
      subtitle: "release: controller",
    },
    { id: "nested", title: "Nested", kind: "NODE_KIND_NAMESPACE", parent: "shared-root" },
    { id: "crds", title: "CRDs", kind: "NODE_KIND_ARTIFACT", parent: "nested" },
    { id: "unused", title: "Unused", kind: "NODE_KIND_COMPONENT", parent: "nested" },
    { id: "app-root", title: "App", kind: "NODE_KIND_GROUP", parent: "cluster", domain: "app" },
    { id: "frontend", title: "Frontend", kind: "NODE_KIND_COMPONENT", parent: "app-root" },
    { id: "backend", title: "Backend", kind: "NODE_KIND_COMPONENT", parent: "app-root" },
  ],
  edges: [
    { source: "frontend", target: "controller", kind: "EDGE_KIND_CONFIG" },
    { source: "controller", target: "crds", kind: "EDGE_KIND_CONFIG" },
    { source: "frontend", target: "backend", kind: "EDGE_KIND_REQUEST" },
  ],
};
const source = parseArchitecture({ "architecture.json": JSON.stringify(definition) });

describe("expanded domain ranges", () => {
  it("encloses concrete members in a classified overview frame and keeps other domains collapsed", () => {
    const view = viewOf(source, "");
    const { model } = view;
    expect(model.nodes.get("shared")).toMatchObject({
      kind: NodeKind.GROUP,
      parent: "overview/core",
    });
    expect(model.nodes.get("app")?.kind).toBe(NodeKind.COMPONENT);
    expect(model.children.get("shared")?.map((node) => node.id)).toEqual([
      "controller",
      "crds",
      "unused",
    ]);
    expect(model.nodes.get("controller")?.subtitle).toBe("release: controller");
    for (const id of ["cluster", "shared-root", "nested", "frontend", "backend"])
      expect(model.nodes.has(id), id).toBe(false);
    expect([...model.edges.keys()]).toEqual(["app->controller", "controller->crds"]);
    for (const edge of model.edges.values()) {
      expect(model.children.has(edge.source)).toBe(false);
      expect(model.children.has(edge.target)).toBe(false);
    }
    expect(represent(view, "controller")).toBe("controller");
    expect(represent(view, "frontend")).toBe("app");
    expect(source.nodes.get("controller")?.parent).toBe("shared-root");
    expect(source.children.get("shared-root")?.map((node) => node.id)).toEqual([
      "controller",
      "nested",
    ]);
  });

  it("shows only adjacent range members in another domain's native deployment frames", () => {
    const { model } = viewOf(source, "app");
    expect(model.nodes.has("shared")).toBe(false);
    expect(model.nodes.get("controller")?.parent).toBe("shared-root");
    expect(model.nodes.get("shared-root")?.parent).toBe("cluster");
    for (const id of ["crds", "unused", "nested"]) expect(model.nodes.has(id), id).toBe(false);
    expect([...model.edges.keys()]).toEqual(["frontend->controller", "frontend->backend"]);
  });

  it("keeps the explicit range detail view and its original nested containers", () => {
    const { model } = viewOf(source, "shared");
    expect(model.nodes.get("controller")?.parent).toBe("shared-root");
    expect(model.nodes.get("crds")?.parent).toBe("nested");
    expect(model.nodes.has("unused")).toBe(true);
    expect(model.nodes.get("app")?.kind).toBe(NodeKind.COMPONENT);
    expect(model.nodes.has("frontend")).toBe(false);
  });

  it("uses one classified overview range across multiple deployment roots", () => {
    const spanning = parseArchitecture({
      "architecture.json": JSON.stringify({
        ...definition,
        domains: definition.domains.map((domain) =>
          domain.id === "shared" ? { ...domain, category: "DOMAIN_CATEGORY_OPTIONAL" } : domain,
        ),
        nodes: [
          ...definition.nodes,
          { id: "remote", title: "Remote", kind: "NODE_KIND_CLUSTER", tier: 2 },
          {
            id: "remote-controller",
            title: "Remote controller",
            kind: "NODE_KIND_COMPONENT",
            parent: "remote",
            domain: "shared",
          },
          {
            id: "standalone",
            title: "Standalone",
            kind: "NODE_KIND_COMPONENT",
            domain: "shared",
            tier: 3,
          },
        ],
      }),
    });
    const { model } = viewOf(spanning, "");
    expect(model.nodes.get("shared")?.parent).toBe("overview/optional");
    expect(model.nodes.get("remote-controller")?.parent).toBe("shared");
    expect(model.nodes.get("standalone")).toMatchObject({ parent: "shared", tier: 0 });
    expect(spanning.nodes.get("standalone")?.tier).toBe(3);
    expect(model.nodes.has("remote")).toBe(false);
  });
});
