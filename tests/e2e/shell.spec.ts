import {
  test,
  expect,
  start,
  state,
  close,
  role,
  confirm,
  capture,
  noOverflow,
} from "./fixtures";

test("Điều hướng chính, tab, bộ lọc và sắp xếp hoạt động", async ({ page }) => {
  await start(page, "/tong-quan");
  for (const [label, url, title] of [
    ["Đồng phục", "/dong-phuc/yeu-cau", "Quản lý đồng phục"],
    ["Tra cứu tài liệu", "/tai-lieu", "Tra cứu tài liệu"],
    ["Tủ đồ", "/tu-do", "Quản lý tủ đồ"],
    ["Mua sắm", "/mua-sam/de-nghi", "Hỗ trợ mua sắm"],
    ["Việc cần phê duyệt", "/phe-duyet", "Việc cần phê duyệt"],
    ["Nhật ký thao tác", "/nhat-ky", "Nhật ký thao tác"],
    ["Thiết lập demo", "/thiet-lap", "Thiết lập demo"],
    ["Tổng quan", "/tong-quan", "Tổng quan vận hành"],
  ]) {
    const menu = page.getByRole("button", {
      name: "Mở điều hướng",
      exact: true,
    });
    if (await menu.isVisible()) await menu.click();
    await page
      .locator("aside")
      .getByRole("link", { name: new RegExp("^" + label + "(?:\\s*\\d+)?$") })
      .click();
    await expect(page).toHaveURL(new RegExp(url + "$"));
    await expect(
      page.getByRole("heading", { name: title, level: 1 }),
    ).toBeVisible();
    await noOverflow(page);
  }
  await page.goto("/dong-phuc/kho");
  await page.getByLabel("Tìm trong Danh mục đồng phục").fill("DP-DD-M");
  await expect(
    page.getByRole("table", { name: "Danh mục đồng phục" }).getByRole("row"),
  ).toHaveCount(2);
  await page.getByLabel("Tìm trong Danh mục đồng phục").fill("");
  await page
    .getByRole("button", { name: "Mã / sản phẩm", exact: true })
    .click();
  await expect(
    page.getByRole("columnheader", { name: "Mã / sản phẩm" }),
  ).toHaveAttribute("aria-sort", "ascending");
  await page
    .getByRole("button", { name: "Mã / sản phẩm", exact: true })
    .click();
  await expect(
    page.getByRole("columnheader", { name: "Mã / sản phẩm" }),
  ).toHaveAttribute("aria-sort", "descending");
  await page
    .getByRole("button", { name: "Trang sau", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Trang trước", exact: true }).first(),
  ).toBeEnabled();
});

test("Thiết lập lưu qua reload; hủy reset không ghi; xác nhận reset nạp seed và KPI", async ({
  page,
}) => {
  await start(page, "/thiet-lap", "system");
  await page.getByLabel("Số bộ mỗi nhân viên / năm").fill("4");
  await page.getByRole("button", { name: "Lưu cấu hình", exact: true }).click();
  await confirm(page);
  await page.reload();
  await expect(page.getByLabel("Số bộ mỗi nhân viên / năm")).toHaveValue("4");
  await page
    .getByRole("button", { name: "Khôi phục dữ liệu demo", exact: true })
    .click();
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  expect((await state(page)).settings.annualLimit).toBe(4);
  await page
    .getByRole("button", { name: "Khôi phục dữ liệu demo", exact: true })
    .click();
  await confirm(page);
  expect((await state(page)).settings.annualLimit).toBe(3);
  expect((await state(page)).purchases).toHaveLength(2);
  expect((await state(page)).audits[0].entityId).toBe("DEMO-RESET");
  await page.goto("/tong-quan");
  await expect(
    page
      .getByRole("link")
      .filter({ hasText: "Tủ trống sẵn sàng cấp" })
      .locator(".metric-value"),
  ).toHaveText("37");
  await role(page, "employee");
  await page.goto("/thiet-lap");
  await expect(page.getByLabel("Số bộ mỗi nhân viên / năm")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Lưu cấu hình", exact: true }),
  ).toHaveCount(0);
});

test("Ảnh tổng quan, bốn phân hệ và trợ lý; không tràn ngang ở portrait/landscape", async ({
  page,
}, testInfo) => {
  await start(page, "/tong-quan");
  for (const [name, url] of [
    ["tong-quan", "/tong-quan"],
    ["dong-phuc", "/dong-phuc/yeu-cau"],
    ["tai-lieu", "/tai-lieu"],
    ["tu-do", "/tu-do"],
    ["mua-sam", "/mua-sam/nha-cung-cap"],
  ]) {
    await page.goto(url);
    await expect(page.locator("main h1")).toBeVisible();
    await capture(page, testInfo, name);
  }
  const pending = (await state(page)).purchases.find(
    (p) => p.status === "pending",
  )!;
  await page.goto("/mua-sam/de-nghi/" + pending.id);
  await expect(page.getByLabel("Tiến trình phê duyệt")).toBeVisible();
  await capture(page, testInfo, "luong-phe-duyet");
  await close(page);
  await page.goto("/trinh-dien");
  await expect(
    page.getByRole("heading", { name: "5 kịch bản trong 10 phút", level: 1 }),
  ).toBeVisible();
  await capture(page, testInfo, "kich-ban-trinh-dien");
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  const chat = page.getByRole("dialog", { name: "Trợ lý tra cứu demo" });
  await expect(chat.getByLabel("Câu hỏi cho trợ lý")).toBeFocused();
  await capture(page, testInfo, "tro-ly");
  await page.setViewportSize({ width: 844, height: 390 });
  const bounds = await chat.boundingBox(),
    input = await chat.getByLabel("Câu hỏi cho trợ lý").boundingBox();
  expect(
    bounds &&
      bounds.x >= 0 &&
      bounds.y >= 0 &&
      bounds.x + bounds.width <= 844 &&
      bounds.y + bounds.height <= 390,
  ).toBe(true);
  expect(input && input.y + input.height <= 390).toBe(true);
  await capture(page, testInfo, "tro-ly-landscape");
  await page.getByRole("button", { name: "Đóng trợ lý", exact: true }).click();
  await expect(page.getByRole("button", { name: "Trợ lý demo" })).toBeFocused();
});
