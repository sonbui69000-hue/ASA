import type { Page } from "@playwright/test";
import {
  test,
  expect,
  start,
  state,
  close,
  confirm,
  dossierAction,
  ask,
  capture,
  noOverflow,
} from "./fixtures";
import {
  demoUniformLines,
  demoLockerEmployees,
} from "../../src/domain/demo-scenarios";
import { availableLockers, issued, stock } from "../../src/domain/selectors";

async function begin(page: Page, number: number) {
  await start(page, "/trinh-dien", "system");
  await page
    .getByRole("button", { name: "Nạp lại bộ trình diễn", exact: true })
    .click();
  await confirm(page);
  for (let n = 1; n <= 5; n++)
    await expect(
      page.getByRole("button", { name: `Mở kịch bản ${n}`, exact: true }),
    ).toBeEnabled();
  const before = await state(page);
  expect(before.settings.annualLimit).toBe(3);
  expect(before.settings.reserveRatio).toBe(0.4);
  expect(availableLockers(before)).toHaveLength(37);
  expect(before.mappings.some((m) => m.skuId === "SKU-2-2")).toBe(false);
  await page
    .getByRole("button", { name: `Mở kịch bản ${number}`, exact: true })
    .click();
  await expect(
    page.getByRole("complementary", { name: "Hướng dẫn kịch bản hiện tại" }),
  ).toBeVisible();
  expect(await state(page)).toEqual(before);
  await noOverflow(page);
  return before;
}

test("Trình diễn 1: khoa xin ba nhân viên, duyệt độc lập và bàn giao đúng định mức", async ({
  page,
}, testInfo) => {
  await begin(page, 1);
  await expect(page.getByLabel("Tài khoản demo")).toHaveValue("coord");
  await page.getByRole("button", { name: "Lập yêu cầu", exact: true }).click();
  for (const [i, line] of demoUniformLines.entries()) {
    if (i)
      await page.getByRole("button", { name: "Thêm dòng đồng phục" }).click();
    await page
      .getByLabel(`Nhân viên dòng ${i + 1}`, { exact: true })
      .selectOption(line.employeeId);
    await page
      .getByLabel(`Mã đồng phục dòng ${i + 1}`, { exact: true })
      .selectOption(line.skuId);
  }
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const id = (await state(page)).uniforms.at(-1)!.id,
    url = "/dong-phuc/yeu-cau/" + id;
  await page.goto(url);
  await page
    .getByRole("button", { name: "Gửi duyệt yêu cầu", exact: true })
    .click();
  await confirm(page);
  expect((await state(page)).uniforms.at(-1)!.lines).toEqual(demoUniformLines);
  await expect(page.getByLabel("Tiến trình phê duyệt")).toContainText(
    "Trưởng khoa",
  );
  await capture(page, testInfo, "demo-1-tien-trinh-duyet");
  for (const actor of ["head", "hc"])
    await dossierAction(page, url, actor, "Duyệt yêu cầu");
  await dossierAction(page, url, "warehouse", "Xác nhận bàn giao");
  const after = await state(page);
  expect(after.uniforms.at(-1)!.status).toBe("issued");
  expect(issued(after, "DEMO-NV-031")).toBe(3);
  expect(stock(after, "SKU-1-1")).toEqual({
    physical: 8,
    held: 2,
    available: 6,
  });
  await close(page);
  await page.goto("/dong-phuc/nhan-vien");
  await page
    .getByLabel("Tìm trong Nhân viên", { exact: true })
    .fill("DEMO-NV-031");
  await page.getByRole("button", { name: "Lịch sử cấp", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("260.000 ₫");
  await page.reload();
  expect((await state(page)).uniforms.at(-1)!.status).toBe("issued");
});

test("Trình diễn 2: thiếu hai bộ tạo PR nháp đúng nguồn, chưa tăng tồn", async ({
  page,
}, testInfo) => {
  const before = await begin(page, 2);
  await expect(page.getByLabel("Tài khoản demo")).toHaveValue("buyer");
  await page
    .getByRole("row")
    .filter({ hasText: "DEMO-YC-002" })
    .getByRole("button", { name: "Tạo bản nháp mua" })
    .click();
  await page
    .getByLabel("Mã ngân sách demo", { exact: true })
    .fill("DEMO-NS-LIVE");
  await page.getByRole("button", { name: "Lưu đề nghị nháp" }).click();
  const after = await state(page),
    pr = after.purchases.at(-1)!;
  expect(pr.status).toBe("draft");
  expect(pr.lines).toMatchObject([
    {
      skuId: "SKU-0-3",
      quantity: 2,
      purpose: "shortage",
      sourceRequestId: "DEMO-YC-002",
    },
  ]);
  expect(pr.context).toMatchObject({
    budgetCode: "DEMO-NS-LIVE",
    budgetDepartmentId: "NOI",
    purchaseMonth: "2026-11",
  });
  expect(after.orders).toEqual(before.orders);
  expect(after.movements).toEqual(before.movements);
  expect(stock(after, "SKU-0-3").physical).toBe(0);
  await page.goto("/mua-sam/de-nghi/" + pr.id);
  await expect(page.getByRole("dialog")).toContainText("DEMO-NS-LIVE");
  await capture(page, testInfo, "demo-2-pr-tu-thieu-hang");
});

test("Trình diễn 3: trợ lý trả đoạn hợp đồng hư cấu và mở đúng mục, phiên bản", async ({
  page,
}, testInfo) => {
  const before = await begin(page, 3);
  await page.getByRole("button", { name: "Trợ lý demo", exact: true }).click();
  const turn = await ask(
    page,
    "Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
  );
  await expect(turn).toContainText("10 ngày làm việc");
  await capture(page, testInfo, "demo-3-tro-ly-hop-dong");
  const citation = turn.getByRole("link", {
    name: /Hợp đồng cung cấp đồng phục An Tâm • v1 • 2/,
  });
  await expect(citation).toHaveAttribute(
    "href",
    "/tai-lieu/DEMO-TL-004?version=1#muc-2",
  );
  await citation.click();
  await expect(page.getByRole("dialog").locator("#muc-2")).toContainText(
    "10 ngày làm việc",
  );
  await capture(page, testInfo, "demo-3-doan-dan-nguon");
  expect(await state(page)).toEqual(before);
});

test("Trình diễn 4: xem trước không ghi, phân bổ ba tủ và cập nhật KPI/lịch sử", async ({
  page,
}, testInfo) => {
  const before = await begin(page, 4);
  await page.getByRole("button", { name: "Phân bổ tủ", exact: true }).click();
  await page.getByLabel("Số lượng tủ yêu cầu").fill("3");
  await page
    .getByLabel("Nhân viên nhận tủ", { exact: true })
    .selectOption(demoLockerEmployees);
  await page
    .getByLabel("Lý do phân bổ / giữ chỗ")
    .fill("Phân bổ nhóm trình diễn");
  await page.getByRole("button", { name: "Gợi ý danh sách tủ" }).click();
  expect(await state(page)).toEqual(before);
  await capture(page, testInfo, "demo-4-xem-truoc-tu");
  await page
    .getByRole("button", { name: "Xác nhận phân bổ", exact: true })
    .click();
  const after = await state(page),
    assigned = after.lockers.filter((l) =>
      demoLockerEmployees.includes(l.employeeId),
    );
  expect(assigned).toHaveLength(3);
  expect(new Set(assigned.map((l) => l.id)).size).toBe(3);
  expect(after.lockerEvents).toHaveLength(before.lockerEvents.length + 3);
  expect(availableLockers(after)).toHaveLength(34);
  await page.goto("/tong-quan");
  await expect(
    page
      .getByRole("link")
      .filter({ hasText: "Tủ trống sẵn sàng cấp" })
      .locator(".metric-value"),
  ).toHaveText("34");
  await page.reload();
  expect(availableLockers(await state(page))).toHaveLength(34);
});

test("Trình diễn 5: so sánh mã chưa xác nhận và chốt đúng Cotton/cỡ L, lưu qua reload", async ({
  page,
}, testInfo) => {
  await begin(page, 5);
  await page.getByLabel("Mã nội bộ cần đối sánh").selectOption("SKU-2-2");
  await page.getByLabel("Tra theo mã SAP / tên sản phẩm").fill("bộ kỹ thuật");
  const correct = page.getByRole("row").filter({ hasText: "SAP-A-1010" }),
    different = page.getByRole("row").filter({ hasText: "SAP-B-2010" });
  await expect(correct).toContainText("100% phù hợp");
  await expect(correct).toContainText("Cotton 65%");
  await expect(different).toContainText("80% phù hợp");
  await expect(different).toContainText("Khác chất liệu");
  await capture(page, testInfo, "demo-5-ung-vien-chua-chot");
  await correct
    .getByRole("button", { name: "Xác nhận đối sánh", exact: true })
    .click();
  await page
    .getByLabel("Lý do / ghi chú")
    .fill("Đã đối chiếu loại, cỡ L và Cotton 65% trong catalog demo");
  await confirm(page);
  expect(
    (await state(page)).mappings.find((m) => m.skuId === "SKU-2-2"),
  ).toMatchObject({ productId: "SP-A-SKU-2-2", confirmedBy: "buyer" });
  expect(
    (await state(page)).audits.some(
      (a) => a.action === "mapping.confirm" && a.entityId === "SKU-2-2",
    ),
  ).toBe(true);
  await expect(correct).toContainText("Đã đối chiếu");
  await page.reload();
  await page.getByLabel("Mã nội bộ cần đối sánh").selectOption("SKU-2-2");
  await page.getByLabel("Tra theo mã SAP / tên sản phẩm").fill("SAP-A-1010");
  await expect(
    page.getByRole("row").filter({ hasText: "SAP-A-1010" }),
  ).toContainText("Đã đối chiếu");
});
