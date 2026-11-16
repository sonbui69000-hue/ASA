import {
  test,
  expect,
  start,
  state,
  role,
  close,
  confirm,
  dossierAction,
  ask,
  capture,
} from "./fixtures";
import { legacyState } from "../helpers/legacy-state";
import { issued, stock } from "../../src/domain/selectors";

test("Biến thể nữ 2XL: lọc kho, điều kiện cấp, thiếu hàng, PR/PO, nhận kho, lịch sử và chat", async ({
  page,
}, testInfo) => {
  await start(page, "/dong-phuc/kho", "coord");
  await page
    .getByLabel("Biến thể giới tính", { exact: true })
    .selectOption("female");
  await page.getByLabel("Cỡ đồng phục", { exact: true }).selectOption("XXL");
  const table = page.getByRole("table", { name: "Danh mục đồng phục" });
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table).toContainText("DP-DD-NU-XXL");
  await expect(table).toContainText("0 bộ");
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  await expect(await ask(page, "Tồn kho điều dưỡng nữ 2XL")).toContainText(
    "0 bộ khả dụng",
  );
  await page.getByRole("button", { name: "Đóng trợ lý", exact: true }).click();
  await page.goto("/dong-phuc/yeu-cau");
  await page.getByRole("button", { name: "Lập yêu cầu", exact: true }).click();
  await page
    .getByLabel("Nhân viên dòng 1", { exact: true })
    .selectOption("DEMO-NV-035");
  await expect(page.getByRole("dialog")).toContainText(
    "DEMO-NV-035 · Đã cấp 0 · Đang cam kết 0 · Định mức 3 bộ/năm",
  );
  await expect(
    page
      .getByLabel("Mã đồng phục dòng 1")
      .locator('option[value="SKU-DD-M-XXL"]'),
  ).toHaveCount(0);
  await page.getByLabel("Mã đồng phục dòng 1").selectOption("SKU-DD-F-XXL");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const uid = (await state(page)).uniforms.at(-1)!.id;
  const uniformUrl = "/dong-phuc/yeu-cau/" + uid;
  await page.goto(uniformUrl);
  await page.getByRole("button", { name: "Gửi duyệt yêu cầu" }).click();
  await confirm(page);
  expect((await state(page)).uniforms.at(-1)!.status).toBe("waiting_stock");
  expect(stock(await state(page), "SKU-DD-F-XXL").physical).toBe(0);
  await close(page);
  await role(page, "buyer");
  await page.goto("/mua-sam/nhu-cau");
  await page
    .getByRole("row")
    .filter({ hasText: uid })
    .getByRole("button", { name: "Tạo bản nháp mua" })
    .click();
  await page
    .getByLabel("Ngân sách (mô tả demo)", { exact: true })
    .fill("Bổ sung trang phục demo");
  await page
    .getByLabel("Mã ngân sách demo", { exact: true })
    .fill("DEMO-NS-E2E-45");
  await page
    .getByLabel("Khoa/phòng hạch toán", { exact: true })
    .selectOption("NOI");
  await page.getByLabel("Tháng dự kiến mua", { exact: true }).fill("2026-11");
  await page.getByRole("button", { name: "Lưu đề nghị nháp" }).click();
  const pid = (await state(page)).purchases.at(-1)!.id;
  const purchaseUrl = "/mua-sam/de-nghi/" + pid;
  await page.goto(purchaseUrl);
  await expect(page.getByRole("dialog")).toContainText("DEMO-NS-E2E-45");
  await page.getByRole("button", { name: "Gửi duyệt đề nghị" }).click();
  await confirm(page);
  for (const actor of ["hc", "finance", "leader"])
    await dossierAction(page, purchaseUrl, actor, "Duyệt đề nghị");
  await dossierAction(page, purchaseUrl, "buyer", "Tạo PO SAP mô phỏng");
  const oid = (await state(page)).orders.at(-1)!.id;
  expect(stock(await state(page), "SKU-DD-F-XXL").physical).toBe(0);
  await close(page);
  await role(page, "warehouse");
  await page.goto("/mua-sam/don-hang/" + oid);
  await expect(page.getByRole("dialog")).toContainText("DEMO-NS-E2E-45");
  await page.getByRole("button", { name: "Lập phiếu nhận hàng" }).click();
  await page.getByRole("button", { name: "Xác nhận nhận và tăng kho" }).click();
  expect(stock(await state(page), "SKU-DD-F-XXL").physical).toBe(1);
  await dossierAction(page, uniformUrl, "coord", "Gửi duyệt yêu cầu");
  await dossierAction(page, uniformUrl, "head", "Duyệt yêu cầu");
  await dossierAction(page, uniformUrl, "hc", "Duyệt yêu cầu");
  await dossierAction(page, uniformUrl, "warehouse", "Xác nhận bàn giao");
  expect(issued(await state(page), "DEMO-NV-035")).toBe(1);
  expect(stock(await state(page), "SKU-DD-F-XXL").physical).toBe(0);
  await expect(
    page.getByRole("link", { name: "PR " + pid, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "PO " + oid, exact: true }),
  ).toBeVisible();
  await close(page);
  await page.goto("/dong-phuc/nhan-vien");
  await page
    .getByLabel("Tìm trong Nhân viên", { exact: true })
    .fill("DEMO-NV-035");
  await page.getByRole("button", { name: "Lịch sử cấp", exact: true }).click();
  await expect(
    page.getByRole("table", { name: "Lịch sử cấp phát cá nhân" }),
  ).toContainText("DP-DD-NU-XXL");
  await close(page);
  await page.goto("/mua-sam/bao-cao");
  await page
    .getByLabel("Khoa/phòng tổng hợp mua", { exact: true })
    .selectOption("NOI");
  await page.getByLabel("Tháng tổng hợp mua", { exact: true }).fill("2026-11");
  await page
    .getByLabel("Tìm mã hoặc tên ngân sách", { exact: true })
    .fill("DEMO-NS-E2E-45");
  await expect(page.getByRole("table", { name: "Tổng hợp mua" })).toContainText(
    pid,
  );
  await expect(page.locator(".summary-strip")).toContainText("328.000 ₫");
  await capture(page, testInfo, "doi-chieu-excel-tong-hop");
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  await expect(
    await ask(page, "Nhân viên demo 035 đã nhận mấy bộ?"),
  ).toContainText("đã cấp 1 bộ");
  await expect(await ask(page, "Tồn kho điều dưỡng nữ 2XL")).toContainText(
    "0 bộ khả dụng",
  );
  await page.getByRole("button", { name: "Đóng trợ lý", exact: true }).click();
  await page.reload();
  expect(
    (await state(page)).purchases.find((p) => p.id === pid)!.context.budgetCode,
  ).toBe("DEMO-NS-E2E-45");
});

test("Chuyển localStorage v1 sang v2 giữ hồ sơ, giá lịch sử và dữ liệu sau reload", async ({
  page,
}) => {
  const legacy = legacyState();
  await start(page, "/dong-phuc/nhan-vien", "hc", legacy);
  await expect(
    page.getByText(/Đã nâng dữ liệu demo lên phiên bản 2/),
  ).toBeVisible();
  const migrated = await state(page);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.employees.map((e) => e.id)).toEqual(
    legacy.employees.map((e) => e.id),
  );
  expect(migrated.employees.every((e) => e.gender === "unspecified")).toBe(
    true,
  );
  expect(migrated.issuances).toEqual(legacy.issuances);
  expect(migrated.movements).toEqual(legacy.movements);
  expect(migrated.purchases.map((p) => p.id)).toEqual(
    legacy.purchases.map((p) => p.id),
  );
  expect(migrated.orders.every((o) => o.context.purchaseMonth === "")).toBe(
    true,
  );
  await page
    .getByLabel("Tìm trong Nhân viên", { exact: true })
    .fill("DEMO-NV-031");
  await expect(
    page.getByRole("row").filter({ hasText: "DEMO-NV-031" }),
  ).toContainText("Chưa cập nhật");
  await page.getByRole("button", { name: "Lịch sử cấp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("260.000 ₫");
  await close(page);
  await page.reload();
  expect(await state(page)).toEqual(migrated);
  await expect(
    page.getByText(/Đã nâng dữ liệu demo lên phiên bản 2/),
  ).toHaveCount(0);
});
