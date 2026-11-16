import { test, expect, start, state, close, confirm, role } from "./fixtures";

test("Gợi ý/phân bổ nhiều tủ, ngăn giao trùng, chuyển và thu hồi có lịch sử", async ({
  page,
}) => {
  await start(page, "/tu-do");
  await page.getByRole("button", { name: "Phân bổ tủ", exact: true }).click();
  await page.getByLabel("Số lượng tủ yêu cầu").fill("2");
  await page
    .getByLabel("Nhân viên nhận tủ", { exact: false })
    .selectOption(["DEMO-NV-001", "DEMO-NV-002"]);
  await page
    .getByLabel("Lý do phân bổ / giữ chỗ")
    .fill("Phân bổ nhiều tủ trong QA demo");
  await page.getByRole("button", { name: "Gợi ý danh sách tủ" }).click();
  expect((await state(page)).lockerEvents).toHaveLength(20);
  await page
    .getByRole("button", { name: "Xác nhận phân bổ", exact: true })
    .click();
  const s = await state(page),
    assigned = s.lockers.filter((l) =>
      ["DEMO-NV-001", "DEMO-NV-002"].includes(l.employeeId),
    );
  expect(assigned).toHaveLength(2);
  await page.getByRole("button", { name: "Phân bổ tủ", exact: true }).click();
  await expect(
    page
      .getByLabel("Nhân viên nhận tủ", { exact: false })
      .locator('option[value="DEMO-NV-001"]'),
  ).toHaveCount(0);
  await close(page);
  await page
    .getByLabel("Tìm trong Danh mục tủ", { exact: true })
    .fill(assigned[0].id);
  await page
    .getByRole("button", { name: "Chuyển / nhận tủ", exact: true })
    .click();
  await page
    .getByLabel("Nhân viên nhận chuyển giao")
    .selectOption("DEMO-NV-002");
  await page.getByLabel("Lý do chuyển giao").fill("Thử giao người đã nhận tủ");
  await page
    .getByRole("button", { name: "Xác nhận chuyển giao", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("đã có tủ");
  await close(page);
  await page
    .getByRole("button", { name: "Trả / thu hồi", exact: true })
    .click();
  await page.getByLabel("Lý do / ghi chú").fill("Kết thúc nhu cầu trình diễn");
  await confirm(page);
  expect(
    (await state(page)).lockers.find((l) => l.id === assigned[0].id)!
      .employeeId,
  ).toBe("");
  await page.getByRole("tab", { name: /Lịch sử bàn giao/ }).click();
  await page.getByLabel("Tìm trong Lịch sử tủ đồ").fill(assigned[0].id);
  await expect(
    page.getByRole("row").filter({ hasText: "Trả / thu hồi" }),
  ).toBeVisible();
});

test("Đổi vai trò không lộ người dùng tủ hoặc lịch sử ngoài phạm vi", async ({
  page,
}) => {
  await start(page, "/tu-do", "hc");
  await page
    .getByLabel("Tìm trong Danh mục tủ", { exact: true })
    .fill("DEMO-TU-001");
  await expect(
    page.getByRole("row").filter({ hasText: "Nhân viên demo 041" }),
  ).toBeVisible();
  await role(page, "employee");
  await page
    .getByLabel("Tìm trong Danh mục tủ", { exact: true })
    .fill("DEMO-TU-001");
  await expect(
    page.getByRole("row").filter({ hasText: "Nhân viên demo 041" }),
  ).toHaveCount(0);
  await page.getByRole("tab", { name: /Lịch sử bàn giao/ }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Nhân viên demo 041" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Phân bổ tủ", exact: true }),
  ).toHaveCount(0);
});
