import { describe, expect, it } from "vitest";
import { parseArchitecture } from "@/model/architecture";

const targetFragments = import.meta.glob<string>("./target/**/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
});

// 数据集的专项断言放在数据目录中，随通用测试运行。
describe("example target architecture", () => {
  const target = parseArchitecture(targetFragments);

  it("sends notifications only from the order event consumer", () => {
    const callers = [...target.edges.values()]
      .filter((edge) => edge.target === "sms")
      .map((edge) => edge.source);
    expect(callers).toEqual(["notifier"]);
  });
});
