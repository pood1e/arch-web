import { describe, expect, it } from "vitest";
import { parseArchitecture } from "@/model/architecture";
import targetSource from "./target.json?raw";

// 数据集的专项断言放在数据目录中，随通用测试运行。
describe("example target architecture", () => {
  const target = parseArchitecture(targetSource);

  it("sends notifications only from the order event consumer", () => {
    const callers = [...target.edges.values()]
      .filter((edge) => edge.target === "sms")
      .map((edge) => edge.source);
    expect(callers).toEqual(["notifier"]);
  });
});
