import { test, expect } from "@playwright/test";
const base = "http://127.0.0.1:3000";
test.use({
  viewport: { width: 1440, height: 1000 },
  permissions: ["clipboard-read", "clipboard-write"],
});
test("reader: bilingual navigation, search, copy, context, anchors and history", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/zh/asgard/docs/quick-start/");
  await expect(page.locator("h1")).toContainText("API");
  expect(await page.locator("html").getAttribute("lang")).toBe("zh-CN");
  const rail = page.locator('.reading-rail a[href^="#"]');
  for (const href of await rail.evaluateAll((els) =>
    els.map((e) => e.getAttribute("href")!),
  ))
    expect(await page.locator(`[id="${href.slice(1)}"]`).count()).toBe(1);
  await page.locator(".code-toolbar button").first().click();
  await expect(page.locator(".code-toolbar button").first()).toHaveAttribute(
    "data-copied",
    "true",
  );
  expect(
    (await page.evaluate(() => navigator.clipboard.readText())).length,
  ).toBeGreaterThan(15);
  await page.getByRole("button", { name: "准备 Agent 上下文" }).click();
  await expect(page.locator(".context-panel")).toBeVisible();
  await expect(page.locator(".reading-rail")).toHaveCount(0);
  await page.locator("#agent-task").fill("Create a minimal application");
  await page.getByRole("button", { name: "复制完整上下文" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "Create a minimal application",
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".context-panel")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "准备 Agent 上下文" }),
  ).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("textbox", { name: "搜索文档" }).fill("JWT");
  await expect(page.locator(".search-results a").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator(".locale-link").click();
  await expect(page).toHaveURL(/\/en\/asgard\/docs\/quick-start\//);
  expect(await page.locator("html").getAttribute("lang")).toBe("en");
  await page.goBack();
  await expect(page).toHaveURL(/\/zh\/asgard\/docs\/quick-start\//);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "outputs/reader-desktop.png",
    fullPage: false,
  });
});
test("mobile reader: no horizontal overflow, filter navigation and context dismissal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/en/heimdall/docs/configuration/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole("button", { name: "Documentation", exact: true })
    .click();
  await expect(page.locator(".doc-tree")).toBeVisible();
  await page.locator(".tree-filter input").fill("configuration");
  await expect(page.locator(".tree-group a")).toHaveCount(1);
  await page.locator(".tree-group a").click();
  await page.getByRole("button", { name: "Prepare agent context" }).click();
  await expect(page.locator(".context-panel")).toBeVisible();
  await page
    .getByRole("button", { name: "Close context", exact: true })
    .click();
  await expect(page.locator(".context-panel")).toHaveCount(0);
  await page.screenshot({ path: "outputs/reader-mobile.png", fullPage: false });
});
test("all visible document pages load without runtime errors or overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const docs = await (
    await page.request.get(base + "/search-index.json")
  ).json();
  for (const doc of docs) {
    await page.goto(base + doc.url);
    await expect(page.locator("h1")).toHaveText(doc.title);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      doc.url,
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});

test("search recovers after network failure and ignores trailing whitespace", async ({
  page,
}) => {
  let failed = false;
  await page.route("**/search-index.json", (route) => {
    if (!failed) {
      failed = true;
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(base + "/en/asgard/");
  await page.getByRole("button", { name: "Search documentation" }).click();
  await expect(page.locator(".search-dialog [role=alert]")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Search documentation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Search documentation" }).click();
  await page.getByRole("textbox", { name: "Search documentation" }).fill("JWT");
  await expect(page.locator(".search-results a").first()).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search documentation" })
    .fill("no-such-concept-97531   ");
  await expect(page.getByText("No matching documents")).toBeVisible();
  await expect(page.locator(".search-dialog [role=alert]")).toHaveCount(0);
});
test("semantic architecture diagram and source disclosure render", async ({
  page,
}) => {
  await page.goto(base + "/en/asgard/docs/architecture/");
  await expect(page.locator(".architecture-diagram svg")).toBeVisible();
  await expect(page.locator(".agent-workflow")).toBeVisible();
  await page.locator(".architecture-diagram summary").click();
  await expect(page.locator(".architecture-diagram pre")).toBeVisible();
  await page.screenshot({
    path: "outputs/architecture-desktop.png",
    fullPage: true,
  });
});
