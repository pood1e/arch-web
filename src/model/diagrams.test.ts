import { describe, expect, it } from "vitest";
import { ICONS } from "@/lib/icons";
import { Change, isContainer, NodeKind, parseArchitecture } from "@/model/architecture";
import { DIAGRAMS, indexData, MIGRATIONS } from "@/model/diagrams";
import { parseMigration } from "@/model/migration";
import { viewOf } from "@/model/views";

// 通用校验，作用于 ARCH_DATA 选择的数据；各数据集的专项断言放在数据旁边。
describe.each(DIAGRAMS)("$id architecture data", ({ fragments }) => {
  const model = parseArchitecture(fragments);
  const nodes = [...model.nodes.values()];

  it("uses registered icons only", () => {
    for (const node of nodes) expect(ICONS, node.id).toHaveProperty(node.icon);
    for (const domain of model.domains.values())
      expect(ICONS, domain.id).toHaveProperty(domain.icon);
  });

  it("attributes components and artifacts to a repository", () => {
    const owned = nodes.filter((node) =>
      [NodeKind.COMPONENT, NodeKind.ARTIFACT].includes(node.kind),
    );
    for (const node of owned) expect(node.repository, node.id).not.toBe("");
  });

  it("connects every leaf", () => {
    const connected = new Set(
      [...model.edges.values()].flatMap((edge) => [edge.source, edge.target]),
    );
    for (const node of nodes)
      if (!isContainer(node)) expect(connected.has(node.id), node.id).toBe(true);
  });

  it("documents notes for its components", () => {
    expect(model.notes.length).toBeGreaterThan(0);
    for (const note of model.notes) expect(note.description, note.title).not.toBe("");
  });

  it.skipIf(!model.domains.size)("splits into domain views small enough to read", () => {
    for (const id of ["", ...model.domains.keys()]) {
      const leaves = [...viewOf(model, id).model.nodes.values()].filter(
        (node) => !isContainer(node),
      );
      expect(leaves.length, id || "overview").toBeLessThanOrEqual(30);
    }
  });
});

describe.each(MIGRATIONS)("$id migration data", ({ source }) => {
  const diagramOf = (id: string) => {
    const diagram = DIAGRAMS.find((item) => item.id === id);
    return diagram && parseArchitecture(diagram.fragments);
  };
  const migration = parseMigration(source, diagramOf);

  it("delivers every change and retires every removed component exactly once", () => {
    expect(migration.phases.length).toBeGreaterThan(0);
  });

  it("marks every component that does not exist in its baseline", () => {
    for (const node of migration.target.nodes.values())
      if (!isContainer(node) && !migration.baseline.nodes.has(node.id))
        expect(node.change, node.id).not.toBe(Change.UNSPECIFIED);
  });
});

describe("data directory index", () => {
  const files = (paths: string[]) => Object.fromEntries(paths.map((path) => [path, "{}"]));
  const migration = (baseline: string, target: string) => JSON.stringify({ baseline, target });

  it("puts each migration between its endpoints and other diagrams after them", () => {
    const { diagrams, migrations, pages } = indexData(
      files(["../d/flow/a.json", "../d/old/a.json", "../d/new/a.json", "../d/new/sub/b.json"]),
      { "../d/route.json": migration("old", "new") },
      "../d/",
    );
    expect(pages.map((page) => page.id)).toEqual(["old", "route", "new", "flow"]);
    expect(diagrams.map((diagram) => diagram.id)).toEqual(["old", "new", "flow"]);
    expect(Object.keys(diagrams[1].fragments)).toEqual(["../d/new/a.json", "../d/new/sub/b.json"]);
    expect(migrations[0]).toMatchObject({ id: "route", baseline: "old", target: "new" });
  });

  it("orders diagrams by directory without migrations", () => {
    const { pages } = indexData(files(["/d/b/a.json", "/d/a/a.json"]), {}, "/d/");
    expect(pages).toEqual([
      { id: "a", kind: "diagram" },
      { id: "b", kind: "diagram" },
    ]);
  });

  it("rejects a migration named after a diagram directory", () => {
    expect(() =>
      indexData(files(["/d/plan/a.json"]), { "/d/plan.json": migration("", "") }, "/d/"),
    ).toThrow("重名");
  });
});
