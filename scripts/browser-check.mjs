import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
const output = path.resolve("output/playwright"),
  dist = path.resolve("dist");
await mkdir(output, { recursive: true });
const results = [];
const assistantOnly = process.argv.includes("--assistant-only");
const resultFile = path.join(
  output,
  assistantOnly ? "assistant-browser-result.json" : "browser-result.json",
);
let browser;
const key = "vinmec-admin-demo:state:v1";
async function state(page) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), key);
}
async function confirm(page) {
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
}
async function close(page) {
  await page
    .getByRole("button", { name: "Đóng hộp thoại", exact: true })
    .click();
}
async function actor(page, id) {
  await page.getByLabel("Tài khoản demo").selectOption(id);
}
async function app(route) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "vi-VN",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== "http://asa.demo") {
      await route.abort();
      return;
    }
    const name = url.pathname.startsWith("/assets/")
      ? url.pathname.slice(1)
      : "index.html";
    const file = path.resolve(dist, name);
    assert.ok(file.startsWith(dist + path.sep));
    try {
      await route.fulfill({
        body: await readFile(file),
        contentType: file.endsWith(".js")
          ? "text/javascript"
          : file.endsWith(".css")
            ? "text/css"
            : "text/html",
      });
    } catch {
      await route.fulfill({ status: 404, body: "Không có tài nguyên demo" });
    }
  });
  await page.goto("http://asa.demo" + route);
  return { page, context, errors };
}
async function journey(name, route, fn) {
  if (assistantOnly && name !== "00-tro-ly") return;
  const { page, context, errors } = await app(route);
  try {
    await fn(page);
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: path.join(output, name + ".png"),
      fullPage: true,
    });
    results.push({ name, status: "passed" });
  } finally {
    await context.close();
  }
}
try {
  await access(path.join(dist, "index.html"));
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {}),
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  await journey("00-tro-ly", "/tong-quan", async (page) => {
    await actor(page, "warehouse");
    await page.getByRole("button", { name: "Trợ lý demo" }).click();
    const chat = page.getByRole("dialog", { name: "Trợ lý tra cứu demo" });
    await chat
      .getByRole("button", { name: "Tồn kho DP-DD-M", exact: true })
      .click();
    await chat
      .getByText(/10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng/)
      .waitFor();
    const source = chat.getByRole("link", { name: /DP-DD-M/ });
    assert.equal(
      await source.getAttribute("href"),
      "/dong-phuc/kho?sku=SKU-1-1&warehouse=TT",
    );
    await source.click();
    await page.getByLabel("Tìm trong Danh mục đồng phục").fill("DP-DD-M");
    await page
      .getByRole("row")
      .filter({ hasText: "DP-DD-M" })
      .getByRole("button", { name: "Điều chỉnh kho", exact: true })
      .click();
    await page.getByLabel("Số bộ điều chỉnh (+ tăng, − giảm)").fill("2");
    await page
      .getByLabel("Lý do kiểm kê")
      .fill("Kiểm kê từ nguồn trợ lý trong demo");
    assert.equal(
      (await state(page)).movements.filter(
        (m) => m.reason === "Kiểm kê từ nguồn trợ lý trong demo",
      ).length,
      0,
    );
    await page
      .getByRole("button", { name: "Xác nhận điều chỉnh", exact: true })
      .click();
    await page.getByRole("button", { name: "Trợ lý demo" }).click();
    await chat
      .getByText(/12 bộ vật lý, 2 bộ đang giữ, 10 bộ khả dụng/)
      .waitFor();
    assert.equal(await chat.getByRole("article").count(), 1);
    await chat
      .getByLabel("Câu hỏi cho trợ lý")
      .fill("Định mức đồng phục mỗi năm?");
    await chat
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    const citation = chat.getByRole("link", {
      name: /Chính sách cấp phát đồng phục • v2 • 2/,
    });
    await citation.waitFor();
    assert.equal(
      await citation.getAttribute("href"),
      "/tai-lieu/DEMO-TL-002?version=2#muc-2",
    );
    await citation.click();
    await page
      .getByRole("heading", {
        name: "Chính sách cấp phát đồng phục",
        exact: true,
      })
      .waitFor();
    await close(page);
    await page.getByRole("button", { name: "Trợ lý demo" }).click();
    assert.equal(await chat.getByRole("article").count(), 2);
    await chat
      .getByLabel("Câu hỏi cho trợ lý")
      .fill("Có bao nhiêu tủ trống ở tầng 3?");
    await chat
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await chat.getByText(/Có 20 tủ trống/).waitFor();
    await chat.getByLabel("Câu hỏi cho trợ lý").fill("Còn tầng 2 thì sao?");
    await chat
      .getByRole("button", { name: "Gửi câu hỏi", exact: true })
      .click();
    await chat.getByText(/Có 17 tủ trống/).waitFor();
    await page.reload();
    await page.getByRole("button", { name: "Trợ lý demo" }).click();
    await chat
      .getByText(/12 bộ vật lý, 2 bộ đang giữ, 10 bộ khả dụng/)
      .waitFor();
    assert.equal(await chat.getByRole("article").count(), 4);
    for (const [width, height] of [
      [375, 812],
      [812, 375],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      const bounds = await chat.boundingBox();
      assert.ok(
        bounds &&
          bounds.x >= 0 &&
          bounds.y >= 0 &&
          bounds.x + bounds.width <= width &&
          bounds.y + bounds.height <= height,
      );
      const composer = await chat
        .getByLabel("Câu hỏi cho trợ lý")
        .boundingBox();
      assert.ok(composer && composer.y + composer.height <= height);
      await page.screenshot({
        path: path.join(output, `assistant-${width}x${height}.png`),
        fullPage: true,
      });
    }
  });
  await journey("01-dong-phuc", "/dong-phuc/yeu-cau", async (page) => {
    await actor(page, "coord");
    await page
      .getByRole("button", { name: "Lập yêu cầu", exact: true })
      .click();
    await page.getByLabel("Nhân viên dòng 1").selectOption("DEMO-NV-031");
    await page.getByLabel("Mã đồng phục dòng 1").selectOption("SKU-1-1");
    await page.getByRole("button", { name: "Lưu bản nháp" }).click();
    const id = (await state(page)).uniforms.at(-1).id;
    await page
      .getByRole("row")
      .filter({ hasText: id })
      .getByRole("button", { name: "Xem hồ sơ" })
      .click();
    await page.getByRole("button", { name: "Gửi duyệt yêu cầu" }).click();
    await confirm(page);
    for (const [a, label] of [
      ["head", "Duyệt yêu cầu"],
      ["hc", "Duyệt yêu cầu"],
      ["warehouse", "Xác nhận bàn giao"],
    ]) {
      await close(page);
      await actor(page, a);
      await page
        .getByRole("row")
        .filter({ hasText: id })
        .getByRole("button", { name: "Xem hồ sơ" })
        .click();
      await page.getByRole("button", { name: label, exact: true }).click();
      await confirm(page);
    }
    assert.equal((await state(page)).uniforms.at(-1).status, "issued");
    await page.reload();
    assert.equal(
      (await state(page)).issuances
        .filter((i) => i.employeeId === "DEMO-NV-031")
        .reduce((n, i) => n + i.quantity, 0),
      3,
    );
  });
  await journey("02-tai-lieu", "/quan-tri-tai-lieu", async (page) => {
    await actor(page, "docs");
    await page
      .getByRole("row")
      .filter({ hasText: "DEMO-TL-006" })
      .getByRole("button", { name: "Xem / xử lý" })
      .click();
    for (const label of [
      "Che thông tin cá nhân",
      "Xác nhận rà soát",
      "Xuất bản và lập chỉ mục",
    ]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await confirm(page);
    }
    await close(page);
    await actor(page, "employee");
    await page.goto("http://asa.demo/tai-lieu/DEMO-TL-006");
    await page
      .getByRole("heading", {
        name: "Hướng dẫn bàn giao cần rà soát",
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page
        .getByRole("dialog")
        .getByText(/0900000000/)
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Xác nhận đã đọc" }).click();
    await confirm(page);
    assert.equal(
      (await state(page)).documents.find((d) => d.id === "DEMO-TL-006")
        .signatures.length,
      1,
    );
  });
  await journey("03-mua-sam", "/mua-sam/nhu-cau", async (page) => {
    await actor(page, "buyer");
    await page.getByRole("button", { name: "Tạo bản nháp mua" }).click();
    await page.getByRole("button", { name: "Lưu đề nghị nháp" }).click();
    const id = (await state(page)).purchases.at(-1).id;
    await page.goto("http://asa.demo/mua-sam/de-nghi/" + id);
    await page.getByRole("button", { name: "Gửi duyệt đề nghị" }).click();
    await confirm(page);
    for (const a of ["hc", "finance", "leader"]) {
      await close(page);
      await actor(page, a);
      await page.goto("http://asa.demo/mua-sam/de-nghi/" + id);
      await page
        .getByRole("button", { name: "Duyệt đề nghị", exact: true })
        .click();
      await confirm(page);
    }
    await close(page);
    await actor(page, "buyer");
    await page.goto("http://asa.demo/mua-sam/de-nghi/" + id);
    await page.getByRole("button", { name: "Tạo PO SAP mô phỏng" }).click();
    await confirm(page);
    const oid = (await state(page)).orders.at(-1).id;
    await close(page);
    await actor(page, "warehouse");
    await page.goto("http://asa.demo/mua-sam/don-hang/" + oid);
    await page.getByRole("button", { name: "Lập phiếu nhận hàng" }).click();
    await page
      .getByRole("button", { name: "Xác nhận nhận và tăng kho" })
      .click();
    assert.equal((await state(page)).orders.at(-1).status, "received");
    assert.equal((await state(page)).receipts.at(-1).lines[0].quantity, 2);
  });
  await journey("04-tu-do", "/tu-do", async (page) => {
    await actor(page, "hc");
    await page.getByRole("button", { name: "Phân bổ tủ", exact: true }).click();
    await page.getByLabel("Số lượng tủ yêu cầu").fill("2");
    await page.getByLabel("Hình thức giao").selectOption("department");
    await page.getByLabel("Đơn vị nhận tủ").selectOption("NOI");
    await page
      .getByLabel("Lý do phân bổ / giữ chỗ")
      .fill("Giao cho đơn vị trong kịch bản demo");
    await page.getByRole("button", { name: "Gợi ý danh sách tủ" }).click();
    await page
      .getByRole("button", { name: "Xác nhận phân bổ", exact: true })
      .click();
    const locker = (await state(page)).lockers.find(
      (l) => l.assignedDepartmentId === "NOI",
    );
    assert.ok(locker);
    await page.getByLabel("Tìm trong Danh mục tủ").fill(locker.id);
    await page
      .getByRole("row")
      .filter({ hasText: locker.id })
      .getByRole("button", { name: "Chuyển / nhận tủ" })
      .click();
    await page
      .getByLabel("Nhân viên nhận chuyển giao")
      .selectOption("DEMO-NV-001");
    await page
      .getByLabel("Lý do chuyển giao")
      .fill("Bàn giao người sử dụng mới");
    await page.getByRole("button", { name: "Xác nhận chuyển giao" }).click();
    await page
      .getByRole("button", { name: "Trả / thu hồi", exact: true })
      .click();
    await page.getByLabel("Lý do / ghi chú").fill("Kết thúc nhu cầu sử dụng");
    await confirm(page);
    assert.equal(
      (await state(page)).lockers.find((l) => l.id === locker.id).employeeId,
      "",
    );
  });
  await journey("05-responsive", "/tong-quan", async (page) => {
    for (const [width, height] of [
      [375, 812],
      [812, 375],
      [768, 1024],
      [1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await page.getByRole("heading", { name: "Tổng quan vận hành" }).waitFor();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
        `Tràn ngang ${width}`,
      );
      await page.screenshot({
        path: path.join(output, `responsive-${width}x${height}.png`),
        fullPage: true,
      });
    }
  });
  await writeFile(
    resultFile,
    JSON.stringify(
      {
        status: "passed",
        mode: "Chromium thật trên production build, nội dung phục vụ bằng Playwright route cục bộ, không cần mở cổng",
        results,
      },
      null,
      2,
    ),
  );
  console.log("Playwright: " + results.length + " hành trình thành công.");
} catch (error) {
  const status = browser ? "failed" : "blocked";
  await writeFile(
    resultFile,
    JSON.stringify(
      {
        status,
        scope: assistantOnly ? "assistant" : "all",
        results,
        error: String(error),
      },
      null,
      2,
    ),
  );
  console.error("Playwright " + status + ": " + String(error));
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
