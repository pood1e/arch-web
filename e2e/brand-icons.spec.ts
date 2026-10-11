import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`loads and exports upstream icons in the ${theme} theme`, async ({ page }) => {
    test.setTimeout(60_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((value) => localStorage.setItem("arch-web-theme", value), theme);
    await page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return url.hostname === "127.0.0.1" || url.protocol === "data:"
        ? route.continue()
        : route.abort();
    });

    await page.goto("/#current");
    const loki = page.locator('.react-flow__node[data-id="loki"] img');
    await expect(loki).toHaveAttribute("alt", "");
    await expect(loki).toHaveCSS("color-scheme", theme);

    await page.goto("/#target/observability");
    await expect(page.locator(".react-flow__node-leaf")).toHaveCount(7);
    for (const id of ["loki", "tempo"]) {
      const icon = page.locator(`.react-flow__node[data-id="${id}"] img`);
      await expect(icon).toBeVisible();
      await expect(icon).toHaveJSProperty("complete", true);
      expect(
        await icon.evaluate((element) => (element as HTMLImageElement).naturalWidth),
      ).toBeGreaterThan(0);
    }

    const geometry = await page.evaluate(() => {
      const nodes = [...document.querySelectorAll(".react-flow__node")].map((node) =>
        node.getBoundingClientRect(),
      );
      const viewport = document.querySelector(".react-flow__viewport");
      if (!viewport) throw new Error("Missing viewport");
      const scale = new DOMMatrix(getComputedStyle(viewport).transform).a;
      const left = Math.min(...nodes.map((node) => node.left));
      const top = Math.min(...nodes.map((node) => node.top));
      const width = Math.ceil((Math.max(...nodes.map((node) => node.right)) - left) / scale + 96);
      const crops = ["loki", "tempo"].map((id) => {
        const icon = document.querySelector(`.react-flow__node[data-id="${id}"] img`);
        if (!icon) throw new Error(`Missing icon: ${id}`);
        const rect = icon.getBoundingClientRect();
        return {
          id,
          x: (rect.x - left) / scale + 48,
          y: (rect.y - top) / scale + 48,
          width: rect.width / scale,
          height: rect.height / scale,
        };
      });
      return { width, crops };
    });
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "导出 PNG" }).click();
    const download = await downloaded;
    expect(await download.failure()).toBeNull();
    const path = await download.path();
    if (!path) throw new Error("Missing PNG download");
    const png = (await readFile(path)).toString("base64");
    const pixels = await page.evaluate(
      async ({ png, geometry }) => {
        const image = new Image();
        image.src = `data:image/png;base64,${png}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Missing canvas context");
        ctx.drawImage(image, 0, 0);
        const ratio = image.width / geometry.width;
        return geometry.crops.map((crop) => {
          const { data } = ctx.getImageData(
            Math.round(crop.x * ratio),
            Math.round(crop.y * ratio),
            Math.max(1, Math.round(crop.width * ratio)),
            Math.max(1, Math.round(crop.height * ratio)),
          );
          let orange = 0;
          for (let i = 0; i < data.length; i += 4)
            if (
              data[i] > 180 &&
              data[i + 1] > 50 &&
              data[i] > data[i + 1] + 30 &&
              data[i + 2] < 140
            )
              orange++;
          return { id: crop.id, orange };
        });
      },
      { png, geometry },
    );
    for (const icon of pixels) expect(icon.orange, icon.id).toBeGreaterThan(3);

    await page.goto("/#target/platform");
    const valkey = page.locator('.react-flow__node[data-id="valkey"] img');
    await expect(valkey).toBeVisible();
    await expect(valkey).toHaveJSProperty("complete", true);
    expect(errors).toEqual([]);
  });
}
