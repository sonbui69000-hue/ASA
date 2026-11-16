import { test as base, expect } from "@playwright/test";

export const test = base.extend<{ health: void }>({
  health: [
    async ({ page }, use, info) => {
      const consoleErrors: string[] = [],
        pageErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      await use();
      await info.attach("browser-health", {
        body: JSON.stringify(
          {
            consoleErrors,
            pageErrors,
            note: "Negative permission journeys deliberately request 404 responses. Review resource errors alongside each journey.",
          },
          null,
          2,
        ),
        contentType: "application/json",
      });
      expect.soft(pageErrors, "Lỗi JavaScript chưa xử lý").toEqual([]);
    },
    { auto: true },
  ],
});
