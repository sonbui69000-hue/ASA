import { expect, type Page } from "@playwright/test";
import { test } from "./online-fixtures";
async function login(page: Page, actor: string) {
  await page.getByLabel("Tài khoản máy chủ").selectOption(actor);
  await page.getByLabel("Mã truy cập demo").fill("synthetic-browser-code");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator("main h1")).toBeVisible();
  test.info().annotations.push({
    type: "application-loaded",
    description: "Authenticated online application",
  });
}
async function ask(page: Page, question: string) {
  await page.getByRole("button", { name: "Trợ lý demo", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Trợ lý tra cứu demo" });
  await dialog.getByLabel("Câu hỏi cho trợ lý").fill(question);
  await dialog
    .getByRole("button", { name: "Gửi câu hỏi", exact: true })
    .click();
  const turn = dialog.getByRole("article").last();
  await expect(turn.locator(".chat-state")).toBeVisible();
  return turn;
}
test.beforeEach(async ({ page }) => {
  const session = await page.request.post("/api/session", {
    headers: { Origin: "http://127.0.0.1:8080" },
    data: { accountId: "system", credential: "synthetic-browser-code" },
  });
  expect(session.ok()).toBe(true);
  const { csrf, view } = await session.json();
  const reset = await page.request.post("/api/demo/reset", {
    headers: { Origin: "http://127.0.0.1:8080", "X-CSRF-Token": csrf },
    data: { confirmed: true, expectedStateRef: view.readModel.ref },
  });
  expect(reset.ok()).toBe(true);
  await page.request.delete("/api/session", {
    headers: { Origin: "http://127.0.0.1:8080", "X-CSRF-Token": csrf },
  });
  await page.goto("/tong-quan");
});
test("Online: kiểm kê qua UI rồi trợ lý đọc đúng state sau commit và reload", async ({
  page,
}) => {
  await login(page, "warehouse");
  let turn = await ask(page, "Kho còn bao nhiêu bộ DP-DD-M?");
  await expect(turn).toContainText(
    "10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng",
  );
  await turn.getByRole("link", { name: /DP-DD-M/ }).click();
  await page.getByLabel("Tìm trong Danh mục đồng phục").fill("DP-DD-M");
  await page
    .getByRole("button", { name: "Điều chỉnh kho", exact: true })
    .click();
  await page.getByLabel("Số bộ điều chỉnh (+ tăng, − giảm)").fill("2");
  await page.getByLabel("Lý do kiểm kê").fill("Kiểm kê tổng hợp từ browser");
  await page
    .getByRole("button", { name: "Xác nhận điều chỉnh", exact: true })
    .click();
  turn = await ask(page, "Kho còn bao nhiêu bộ DP-DD-M?");
  await expect(turn).toContainText(
    "12 bộ vật lý, 2 bộ đang giữ, 10 bộ khả dụng",
  );
  await page.reload();
  turn = await ask(page, "Tồn kho DP-DD-M");
  await expect(turn).toContainText("12 bộ vật lý");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("vinmec-admin-demo:state:v1"),
    ),
  ).toBeNull();
});
test("Online: localStorage role giả không cấp quyền, đổi account yêu cầu credential và không giữ nguồn cũ", async ({
  page,
}) => {
  await page.evaluate(() => localStorage.setItem("asa-demo-account", "system"));
  await login(page, "employee");
  const denied = await page.request.get("/api/documents/DEMO-TL-004?version=1");
  expect(denied.status()).toBe(404);
  let turn = await ask(page, "Thời hạn giao hàng trong hợp đồng An Tâm là gì?");
  await expect(turn.getByRole("link")).toHaveCount(0);
  await page.getByRole("button", { name: "Đóng trợ lý", exact: true }).click();
  await page.getByLabel("Tài khoản demo").selectOption("buyer");
  await login(page, "buyer");
  turn = await ask(page, "Thời hạn giao hàng trong hợp đồng An Tâm là gì?");
  await expect(turn).toContainText("10 ngày làm việc");
  await page.getByRole("button", { name: "Đóng trợ lý", exact: true }).click();
  await page.getByLabel("Tài khoản demo").selectOption("employee");
  await login(page, "employee");
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  await expect(page.getByRole("log")).not.toContainText("10 ngày làm việc");
});
test("Online: sự cố provider được gắn nhãn dự phòng và chat không ghi nghiệp vụ", async ({
  page,
}, info) => {
  await login(page, "warehouse");
  const before = await (await page.request.get("/api/state/ref")).json();
  const turn = await ask(page, "Tồn kho DP-DD-M dự phòng");
  await page
    .getByRole("dialog")
    .screenshot({ path: info.outputPath("assistant-provider-error.png") });
  await expect(turn).toContainText("Tra cứu xác định (dự phòng)");
  await expect(turn).toContainText("10 bộ vật lý");
  expect(await (await page.request.get("/api/state/ref")).json()).toEqual(
    before,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
test("RAG: tìm nguồn, mở đúng mục và thu hồi làm dẫn nguồn cũ không khả dụng", async ({
  page,
}, info) => {
  await login(page, "buyer");
  const turn = await ask(
    page,
    "Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
  );
  await expect(turn).toContainText("Trả lời AI có nguồn");
  await page
    .getByRole("dialog")
    .screenshot({ path: info.outputPath("assistant-grounded-citations.png") });
  const source = turn
    .getByRole("link", { name: /Hợp đồng cung cấp đồng phục An Tâm/ })
    .first();
  const href = (await source.getAttribute("href"))!;
  await source.click();
  await expect(page.locator("mark")).toContainText("10 ngày làm việc");
  await expect(page).toHaveURL(/version=1&chunk=[a-f0-9]+#muc-2/);
  await page
    .getByRole("dialog")
    .screenshot({ path: info.outputPath("assistant-source-highlight.png") });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng hộp thoại", exact: true })
    .click();
  await page.getByLabel("Tài khoản demo").selectOption("docs");
  await login(page, "docs");
  await page.goto("/quan-tri-tai-lieu/DEMO-TL-004");
  await page
    .getByRole("button", { name: "Thu hồi tài liệu", exact: true })
    .click();
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await page.goto(href);
  await expect(page.getByRole("dialog")).toContainText(
    "Không có quyền truy cập hoặc nguồn không còn hiệu lực",
  );
  await expect(page.locator("mark")).toHaveCount(0);
});
test("RAG: tìm bằng câu hỏi thường qua dịch vụ và mở trích đoạn được kiểm quyền", async ({
  page,
}) => {
  await login(page, "buyer");
  await page.goto("/tai-lieu");
  await page
    .getByLabel("Tìm tài liệu bằng câu hỏi hoặc từ khóa")
    .fill("Tạo PO đã làm tăng số lượng trong kho chưa?");
  await expect(page.getByRole("status")).toContainText("Truy xuất từ khóa");
  await page
    .getByRole("button", {
      name: "Quy trình đề nghị và nhận hàng",
      exact: true,
    })
    .click();
  await expect(page.locator("mark")).toContainText("Tạo PO không tăng tồn kho");
});
async function followup(page: Page, question: string) {
  const dialog = page.getByRole("dialog", { name: "Trợ lý tra cứu demo" });
  await dialog.getByLabel("Câu hỏi cho trợ lý").fill(question);
  await dialog.getByLabel("Câu hỏi cho trợ lý").press("Enter");
  const turn = dialog.getByRole("article").last();
  await expect(turn.locator(".chat-state")).toBeVisible();
  return turn;
}
test("UX: câu nối tiếp, điều hướng đúng sản phẩm và bố cục desktop/mobile", async ({
  page,
}, info) => {
  await login(page, "warehouse");
  await ask(page, "Tồn kho DP-DD-M");
  const next = await followup(page, "Thế cỡ L thì sao?");
  await expect(next).toContainText("DP-DD-L");
  await expect(page.getByLabel("Ngữ cảnh hội thoại")).toContainText("cỡ L");
  await page
    .getByRole("dialog")
    .screenshot({ path: info.outputPath("assistant-context.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await next.getByRole("link", { name: /DP-DD-L/ }).click();
  await expect(page).toHaveURL(/sku=SKU-1-2&warehouse=TT/);
  await expect(
    page.getByRole("table", { name: "Danh mục đồng phục" }).getByRole("row"),
  ).toHaveCount(2);
});
test("UX: chọn rõ mã đồng phục trước khi đọc số tồn", async ({
  page,
}, info) => {
  await login(page, "warehouse");
  const before = await (await page.request.get("/api/state/ref")).json();
  const turn = await ask(page, "Tồn kho áo điều dưỡng size XXL");
  const group = turn.getByRole("group", { name: "Chọn thông tin cần làm rõ" });
  await expect(group).toBeVisible();
  await page
    .getByRole("dialog")
    .screenshot({ path: info.outputPath("assistant-clarification.png") });
  await group.getByRole("button", { name: /DP-DD-NU-XXL/ }).click();
  await expect(page.getByRole("article").last()).toContainText(
    "DP-DD-NU-XXL, kho trung tâm",
  );
  expect(await (await page.request.get("/api/state/ref")).json()).toEqual(
    before,
  );
});
test("UX: giữ bộ lọc đề nghị mua và mở đúng hồ sơ", async ({ page }) => {
  await login(page, "buyer");
  await ask(page, "Có đơn mua nào đang chờ phê duyệt?");
  const turn = await followup(page, "Đơn nào liên quan đến đồng phục?");
  await expect(page.getByLabel("Ngữ cảnh hội thoại")).toContainText(
    "chờ duyệt",
  );
  const link = turn.getByRole("link", { name: /DEMO-PR/ }).first(),
    href = (await link.getAttribute("href"))!;
  await link.click();
  await expect(page).toHaveURL(new RegExp(href + "$"));
  await expect(page.getByRole("dialog")).toContainText(href.split("/").at(-1)!);
});
test("UX: chủ đề mới không mượn ngữ cảnh cũ, hủy rồi thử lại không nhân đôi lượt hỏi", async ({
  page,
}, info) => {
  await login(page, "warehouse");
  await ask(page, "Tồn kho DP-DD-M");
  await page.getByRole("button", { name: "Chủ đề mới", exact: true }).click();
  const missing = await followup(page, "Thế cỡ L thì sao?");
  await expect(missing).toContainText("Chưa có ngữ cảnh");
  await page
    .getByLabel("Câu hỏi cho trợ lý")
    .fill("Tồn kho DP-DD-M chờ kiểm thử");
  await page.getByRole("button", { name: "Gửi câu hỏi", exact: true }).click();
  await expect(page.getByRole("log")).toHaveAttribute("aria-busy", "true");
  await page
    .getByRole("dialog")
    .screenshot({ path: info.outputPath("assistant-loading.png") });
  await page.getByRole("button", { name: "Hủy tra cứu", exact: true }).click();
  const canceled = page.getByRole("article").last();
  await expect(canceled).toContainText("Đã hủy tra cứu");
  const count = await page.getByRole("article").count();
  await canceled.getByRole("button", { name: "Thử tra cứu lại" }).click();
  await expect(page.getByRole("article").last()).toContainText("10 bộ vật lý");
  await expect(page.getByRole("article")).toHaveCount(count);
});
test("UX: nguồn nhân viên mở lịch sử cấp và URL ngoài quyền bị từ chối", async ({
  page,
}) => {
  await login(page, "warehouse");
  const turn = await ask(page, "Lịch sử cấp DEMO-NV-033");
  await turn
    .getByRole("link", { name: /DEMO-NV-033/ })
    .first()
    .click();
  await expect(page).toHaveURL(/employee=DEMO-NV-033/);
  await expect(page.getByRole("dialog")).toContainText("DEMO-NV-033");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đóng hộp thoại" })
    .click();
  await page.getByLabel("Tài khoản demo").selectOption("employee");
  await login(page, "employee");
  await page.goto("/dong-phuc/nhan-vien?employee=DEMO-NV-001");
  await expect(
    page.getByText("Hồ sơ nhân viên không khả dụng trong phạm vi được phép."),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
