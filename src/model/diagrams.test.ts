import { describe, expect, it } from "vitest";
import { ICONS } from "@/lib/icons";
import { Change, isContainer, NodeKind, parseArchitecture } from "@/model/architecture";
import { DIAGRAMS, MIGRATION } from "@/model/diagrams";
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
});

describe("migration to the target architecture", () => {
  const current = parseArchitecture(DIAGRAMS[0].fragments);
  const target = parseArchitecture(DIAGRAMS[1].fragments);

  it("delivers every change and retires every removed component exactly once", () => {
    expect(parseMigration(MIGRATION.source, current, target).phases.length).toBeGreaterThan(0);
  });

  it("marks every component that does not exist today", () => {
    for (const node of target.nodes.values())
      if (!isContainer(node) && !current.nodes.has(node.id))
        expect(node.change, node.id).not.toBe(Change.UNSPECIFIED);
  });

  it("splits into domain views small enough to read", () => {
    for (const id of ["", ...target.domains.keys()]) {
      const leaves = [...viewOf(target, id).model.nodes.values()].filter(
        (node) => !isContainer(node),
      );
      expect(leaves.length, id || "overview").toBeLessThanOrEqual(30);
    }
  });
});
