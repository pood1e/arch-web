import { expect, test } from "@playwright/test";

test("navigates migration phases and their components in both architectures", async ({ page }) => {
  await page.goto("/#current");
  await expect(page.locator(".react-flow__node-leaf")).toHaveCount(13);
  const tabs = page.getByRole("navigation", { name: "架构图" });
  await expect(tabs.getByRole("button")).toHaveText(["现状架构", "迁移路线", "目标架构"]);
  await tabs.getByRole("button", { name: "迁移路线" }).click();
  await expect(page).toHaveURL(/#migration$/);
  await expect(page).toHaveTitle("迁移路线");
  await expect(page.getByText("3 个阶段 · 交付 12 个组件 · 下线 5 个组件")).toBeVisible();
  const phaseNav = page.getByRole("navigation", { name: "迁移阶段" });
  await expect(phaseNav.getByRole("link")).toHaveCount(3);
  await expect(page.getByRole("article")).toHaveCount(3);

  const first = page.getByRole("article", { name: "入口与数据底座" });
  await expect(first.getByText("完成标准")).toBeVisible();
  await first.getByRole("button", { name: "Traefik" }).click();
  await expect(page).toHaveURL(/#target\/access$/);
  const details = page.getByRole("complementary", { name: "详情" });
  await expect(details.getByRole("heading", { name: "Traefik" })).toBeVisible();
  await details.getByRole("button", { name: /^阶段 1 · 入口与数据底座/ }).click();
  await expect(page).toHaveURL(/#migration\/1$/);
  await expect(first).toHaveAttribute("aria-current", "step");

  await phaseNav.getByRole("link", { name: /拆分商品与订单/ }).click();
  await expect(page).toHaveURL(/#migration\/2$/);
  const second = page.getByRole("article", { name: "拆分商品与订单" });
  await expect(second).toHaveAttribute("aria-current", "step");
  await second.getByRole("button", { name: "商城单体" }).click();
  await expect(page).toHaveURL(/#current$/);
  await expect(details.getByRole("heading", { name: "商城单体" })).toBeVisible();
  await details.getByRole("button", { name: /^阶段 2 · 拆分商品与订单/ }).click();
  await expect(page).toHaveURL(/#migration\/2$/);
});
