import { expect, test } from "@playwright/test";

test("renders explainer figures and links to each of them", async ({ page }) => {
  await page.goto("/#order-flow");
  await page.getByRole("button", { name: "订单生命周期" }).click();
  await expect(page).toHaveURL(/#order-lifecycle$/);
  await expect(page).toHaveTitle("订单生命周期");
  const figures = page.getByRole("figure");
  await expect(figures).toHaveCount(3);
  const checkout = page.getByRole("figure", { name: /下单与支付/ });
  await expect(checkout.locator("svg").getByText("支付回调")).toBeVisible();
  await expect(page.getByRole("figure", { name: /订单状态/ }).locator("svg")).toBeVisible();

  await page
    .getByRole("navigation", { name: "示意图" })
    .getByRole("link", { name: /订单状态/ })
    .click();
  await expect(page).toHaveURL(/#order-lifecycle\/states$/);
  await expect(page.getByRole("figure", { name: /订单状态/ })).toHaveAttribute(
    "aria-current",
    "location",
  );

  const fill = () =>
    checkout
      .locator("rect.actor")
      .first()
      .evaluate((element) => getComputedStyle(element).fill);
  const light = await fill();
  await page.getByRole("button", { name: /^主题/ }).click();
  await page.getByRole("button", { name: /^主题/ }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect.poll(fill).not.toBe(light);
});

test("colors explainer charts with the site palette", async ({ page }) => {
  await page.goto("/#order-lifecycle/volume");
  const chart = page.getByRole("figure", { name: /近七日订单量/ });
  await expect(chart.getByText("支付成功")).toBeVisible();
  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
  );
  await expect(chart.locator("g.line-plot-0 path")).toHaveAttribute("stroke", primary);
});
