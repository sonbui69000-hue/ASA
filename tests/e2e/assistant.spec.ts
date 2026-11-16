import { test, expect, start, state, ask, close, role } from "./fixtures";
import { createSeed } from "../../src/data/seed";

test("Trợ lý hỏi cả bốn module, thiếu tham số, đối sánh, nguồn và cập nhật sau kiểm kê", async ({
  page,
}) => {
  await start(page, "/tong-quan", "warehouse");
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  let turn = await ask(page, "Còn hàng không?");
  await expect(turn).toContainText("Cần bổ sung");
  turn = await ask(page, "Tồn kho size M");
  await expect(turn).toContainText("Cần chọn mã");
  turn = await ask(page, "Tồn kho DP-DD-M");
  await expect(turn).toContainText(
    "10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng",
  );
  await turn.getByRole("link", { name: /DP-DD-M/ }).click();
  await page.getByLabel("Tìm trong Danh mục đồng phục").fill("DP-DD-M");
  await page
    .getByRole("button", { name: "Điều chỉnh kho", exact: true })
    .click();
  await page.getByLabel("Số bộ điều chỉnh (+ tăng, − giảm)").fill("2");
  await page.getByLabel("Lý do kiểm kê").fill("Kiểm kê theo nguồn trợ lý QA");
  await page
    .getByRole("button", { name: "Xác nhận điều chỉnh", exact: true })
    .click();
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  await expect(page.getByRole("log")).toContainText(
    "12 bộ vật lý, 2 bộ đang giữ, 10 bộ khả dụng",
  );
  turn = await ask(page, "Nhân viên demo 031 đã nhận mấy bộ?");
  await expect(turn).toContainText("đã cấp 2 bộ");
  turn = await ask(page, "Có bao nhiêu tủ trống ở tầng 3?");
  await expect(turn).toContainText("Có 20 tủ trống");
  turn = await ask(page, "Còn tầng 2 thì sao?");
  await expect(turn).toContainText("Có 17 tủ trống");
  turn = await ask(page, "Mã SAP DP-DD-M");
  await expect(turn.getByRole("link", { name: /SAP-A-1005/ })).toBeVisible();
  turn = await ask(page, "DEMO-YC-002 đang chờ ai?");
  await expect(turn).toContainText("Chờ bổ sung");
  turn = await ask(page, "Định mức đồng phục mỗi năm?");
  await turn
    .getByRole("link", { name: /Chính sách cấp phát đồng phục • v2 • 2/ })
    .click();
  await expect(page.getByRole("dialog").locator("#muc-2")).toContainText(
    "3 bộ",
  );
  await close(page);
  await role(page, "employee");
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  await expect(page.getByRole("article")).toHaveCount(0);
  turn = await ask(page, "Tìm hợp đồng An Tâm");
  await expect(turn.getByRole("link")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  expect(
    (await state(page)).movements.some(
      (m) => m.reason === "Kiểm kê theo nguồn trợ lý QA",
    ),
  ).toBe(true);
});

test("Nhân viên trùng tên cần chọn mã, không tự thay bằng người đăng nhập", async ({
  page,
}) => {
  const fixture = createSeed();
  fixture.employees[30].name = "Nhân viên mẫu trùng";
  fixture.employees[31].name = "Nhân viên mẫu trùng";
  await start(page, "/tong-quan", "hc", fixture);
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  const turn = await ask(page, "Nhân viên mẫu trùng đã cấp mấy bộ?");
  await expect(turn).toContainText("Có nhiều nhân viên cùng tên");
  await expect(turn.getByRole("link", { name: /DEMO-NV-031/ })).toBeVisible();
  await expect(turn.getByRole("link", { name: /DEMO-NV-032/ })).toBeVisible();
});
