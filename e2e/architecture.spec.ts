import { expect, type Page, test } from "@playwright/test";

async function open(page: Page, hash: string, leaves: number) {
  await page.goto(`/#${hash}`);
  await expect(page.locator(".react-flow__node-leaf")).toHaveCount(leaves);
}

const viewport = (page: Page) =>
  page.locator(".react-flow__viewport").evaluate((element) => element.style.transform);
const details = (page: Page) => page.getByRole("complementary", { name: "详情" });
const node = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
// 节点的位置随布局变化，可能落在小地图下方，直接派发点击。
const select = (page: Page, id: string) => node(page, id).dispatchEvent("click");

test("renders an architecture without domains", async ({ page }) => {
  await open(page, "current", 13);
  await expect(page).toHaveTitle("现状架构");
  await expect(page.locator(".react-flow__node-frame")).toHaveCount(4);
  await expect(page.locator(".react-flow__edge")).toHaveCount(12);
  await expect(page.getByRole("combobox", { name: "领域" })).toHaveCount(0);
});

test("switches to the domain overview of the target", async ({ page }) => {
  await open(page, "current", 13);
  await page.getByRole("button", { name: "目标架构" }).click();
  await expect(page).toHaveURL(/#target$/);
  await expect(page).toHaveTitle("领域总览 · 目标架构");
  await expect(page.locator(".react-flow__node-leaf")).toHaveCount(10);
  await expect(page.locator(".react-flow__node-frame")).toHaveCount(5);
  await expect(page.locator(".react-flow__edge")).toHaveCount(13);
  await expect(node(page, "traefik")).toHaveCount(0);
  for (const id of ["customer", "payment"]) await expect(node(page, id)).toHaveCount(1);
  await select(page, "overview/optional");
  await expect(details(page).getByRole("heading", { name: "可选领域" })).toBeVisible();
  await expect(details(page).getByRole("button", { name: /^可观测/ })).toBeVisible();
  await expect(details(page).getByRole("button", { name: /^订单/ })).toHaveCount(0);
  await page.goBack();
  await expect(page.locator(".react-flow__node-leaf")).toHaveCount(13);
});

test("drills from the overview into domains", async ({ page }) => {
  await open(page, "target", 10);
  await select(page, "order");
  await expect(details(page).getByRole("heading", { name: "订单" })).toBeVisible();
  await expect(details(page).getByText("节点 · 2（新增 2）")).toBeVisible();
  await details(page).getByRole("button", { name: "进入领域" }).click();
  await expect(page).toHaveURL(/#target\/order$/);
  await expect(page).toHaveTitle("订单 · 目标架构");
  await expect(page.locator(".react-flow__node-leaf")).toHaveCount(9);
  await expect(page.getByRole("combobox", { name: "领域" })).toHaveValue("order");

  await select(page, "order-service");
  await details(page)
    .getByRole("button", { name: /^商品服务/ })
    .click();
  await expect(details(page).getByRole("heading", { name: "扣减库存" })).toBeVisible();
  await details(page)
    .getByRole("button", { name: /^商品服务.*商品$/ })
    .click();
  await expect(page).toHaveURL(/#target\/catalog$/);
  await expect(details(page).getByRole("heading", { name: "商品服务" })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/#target\/order$/);
  await page.getByRole("combobox", { name: "领域" }).selectOption("");
  await expect(page).toHaveURL(/#target$/);
  await expect(page.locator(".react-flow__node-leaf")).toHaveCount(10);
});

test("shows component details, source links and connections", async ({ page }) => {
  await open(page, "current", 13);
  await select(page, "monolith");
  await expect(details(page).getByRole("heading", { name: "商城单体" })).toBeVisible();
  await expect(details(page).getByRole("link", { name: "server", exact: true })).toHaveAttribute(
    "href",
    "https://gitlab.example.com/shop/server/-/tree/main/server",
  );
  await details(page)
    .getByRole("button", { name: /^PostgreSQL/ })
    .click();
  await expect(details(page).getByRole("heading", { name: "SQL", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(details(page)).toBeHidden();
});

test("expands merged connections", async ({ page }) => {
  await open(page, "target", 10);
  await page.locator('.react-flow__edge[data-id="order->platform"]').dispatchEvent("click");
  await expect(details(page).getByRole("heading", { name: "订单 → 平台底座" })).toBeVisible();
  await expect(details(page).getByText("合并 5 条连线")).toBeVisible();
  await details(page)
    .getByRole("button", { name: /订单服务 → PostgreSQL/ })
    .click();
  await expect(details(page).getByRole("heading", { name: "SQL · orders" })).toBeVisible();
});

test("focuses search results and repositories across domains", async ({ page }) => {
  await open(page, "current", 13);
  await page.keyboard.press("/");
  await page.keyboard.type("redis");
  await page.keyboard.press("Enter");
  await expect(details(page).getByRole("heading", { name: "Redis" })).toBeVisible();

  await page.getByRole("button", { name: "仓库", exact: true }).click();
  const repositories = page.getByRole("region", { name: "仓库" });
  await repositories.getByRole("button", { name: /shop-server/ }).click();
  await expect(details(page).getByText("商城单体后端")).toBeVisible();
  await expect(details(page).getByRole("button", { name: /^商城单体/ })).toBeVisible();

  await page.getByRole("button", { name: "目标架构" }).click();
  await expect(page.locator(".react-flow__node-leaf")).toHaveCount(10);
  await page.getByRole("searchbox", { name: "搜索组件或仓库" }).fill("valkey");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#target\/platform$/);
  await expect(details(page).getByRole("heading", { name: "Valkey" })).toBeVisible();

  await page.getByRole("searchbox", { name: "搜索组件或仓库" }).fill("");
  await expect(repositories.getByRole("button", { name: /shop-web/ })).toHaveCount(0);
  await page.getByRole("combobox", { name: "领域" }).selectOption("");
  await repositories.getByRole("button", { name: /shop-order/ }).click();
  await expect(details(page).getByText("规划中的仓库")).toBeVisible();
  await details(page)
    .getByRole("button", { name: /^支付模拟器.*研发$/ })
    .click();
  await expect(page).toHaveURL(/#target\/dev$/);
  await expect(details(page).getByRole("heading", { name: "支付模拟器" })).toBeVisible();
});

test("lists notes per domain and fits the canvas", async ({ page }) => {
  await open(page, "target", 10);
  await page.getByRole("button", { name: "要点", exact: true }).click();
  const notes = page.getByRole("region", { name: "要点" });
  await notes.getByRole("button", { name: /订单事件驱动通知/ }).click();
  await expect(details(page).getByRole("heading", { name: "订单事件驱动通知" })).toBeVisible();
  await expect(details(page).getByRole("button", { name: /^NATS JetStream/ })).toBeVisible();
  await notes.getByRole("button", { name: /OTLP 统一遥测/ }).click();
  await details(page)
    .getByRole("button", { name: /^Tempo/ })
    .click();
  await expect(page).toHaveURL(/#target\/observability$/);
  await expect(details(page).getByRole("heading", { name: "Tempo" })).toBeVisible();
  await expect(notes.getByRole("button", { name: /OTLP 统一遥测/ })).toBeVisible();
  await expect(notes.getByRole("button", { name: /按领域拆分单体/ })).toHaveCount(0);

  const before = await viewport(page);
  await page.getByRole("button", { name: "适应画布" }).click();
  await expect.poll(() => viewport(page)).not.toBe(before);
});
