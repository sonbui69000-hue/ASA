import {
  test as base,
  expect,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { State } from "../../src/domain/types";

// These tests use the real local server. No route.fulfill(), service stubs or state writes after startup.
export const test = base.extend<{ health: void }>({
  health: [
    async ({ page }, use, testInfo) => {
      const consoleErrors: string[] = [],
        pageErrors: string[] = [],
        failedRequests: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error") consoleErrors.push(m.text());
      });
      page.on("pageerror", (e) => pageErrors.push(e.message));
      page.on("requestfailed", (r) =>
        failedRequests.push(
          `${r.method()} ${r.url()} ${r.failure()?.errorText}`,
        ),
      );
      page.on("response", (r) => {
        if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`);
      });
      await use();
      await testInfo.attach("browser-health", {
        body: JSON.stringify(
          { consoleErrors, pageErrors, failedRequests },
          null,
          2,
        ),
        contentType: "application/json",
      });
      expect.soft(consoleErrors, "Lỗi console").toEqual([]);
      expect.soft(pageErrors, "Lỗi JavaScript").toEqual([]);
      expect.soft(failedRequests, "Request thất bại").toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };
export async function start(
  page: Page,
  route: string,
  actor = "hc",
  fixture?: unknown,
) {
  await page.addInitScript(
    ({ actor, fixture }) => {
      if (!sessionStorage.getItem("qa-initialized")) {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("asa-demo-account", actor);
        if (fixture)
          localStorage.setItem(
            "vinmec-admin-demo:state:v1",
            JSON.stringify(fixture),
          );
        sessionStorage.setItem("qa-initialized", "yes");
      }
    },
    { actor, fixture },
  );
  await page.goto(route);
  await expect(page.locator("main h1")).toBeVisible();
  test
    .info()
    .annotations.push({ type: "application-loaded", description: route });
}
export async function state(page: Page): Promise<State> {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("vinmec-admin-demo:state:v1")!),
  );
}
export async function role(page: Page, id: string) {
  await page.getByLabel("Tài khoản demo").selectOption(id);
  await expect(page.getByLabel("Tài khoản demo")).toHaveValue(id);
}
export async function close(page: Page) {
  await page
    .getByRole("button", { name: "Đóng hộp thoại", exact: true })
    .click();
}
export async function confirm(page: Page) {
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
}
export async function dossierAction(
  page: Page,
  path: string,
  actor: string,
  label: string,
) {
  // Close route-based dialogs before switching roles, just as a user would.
  await page.goto("/tong-quan");
  await role(page, actor);
  await page.goto(path);
  await page.getByRole("button", { name: label, exact: true }).click();
  await confirm(page);
}
export async function ask(page: Page, text: string) {
  const dialog = page.getByRole("dialog", { name: "Trợ lý tra cứu demo" });
  await dialog.getByLabel("Câu hỏi cho trợ lý").fill(text);
  await dialog
    .getByRole("button", { name: "Gửi câu hỏi", exact: true })
    .click();
  const turn = dialog.getByRole("article").last();
  const question = turn.getByTestId("chat-user-message");
  await expect(question).toBeVisible();
  await expect(question).toHaveText(text);
  await expect(turn.locator(".chat-state")).toBeVisible();
  return turn;
}
export async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Trang không tràn ngang",
  ).toBe(true);
}
export async function capture(page: Page, testInfo: TestInfo, name: string) {
  await noOverflow(page);
  const directory = path.resolve(
    "output/playwright/screenshots",
    testInfo.project.name,
  );
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, name + ".png");
  await page.screenshot({ path: file, fullPage: true });
  await testInfo.attach(name, { path: file, contentType: "image/png" });
}
