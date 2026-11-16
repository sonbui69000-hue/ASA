import {
  test,
  expect,
  start,
  state,
  role,
  close,
  confirm,
  ask,
} from "./fixtures";

test("Tìm theo tiêu đề/nội dung, mở kết quả và dẫn nguồn đúng mục", async ({
  page,
}) => {
  await start(page, "/tai-lieu", "buyer");
  await page
    .getByLabel("Tìm tài liệu theo từ khóa")
    .fill("Chính sách cấp phát đồng phục");
  await page.getByRole("button", { name: "Đọc tài liệu", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Phiên bản 2");
  await close(page);
  await page.getByLabel("Tìm tài liệu theo từ khóa").fill("10 ngày làm việc");
  await expect(
    page.getByRole("heading", {
      name: "Hợp đồng cung cấp đồng phục An Tâm",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đọc tài liệu", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("SAP-A-1005");
  await close(page);
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  const turn = await ask(
    page,
    "Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
  );
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
});

for (const [id, label] of [
  ["DEMO-TL-004", "ngoài quyền"],
  ["DEMO-TL-999", "không tồn tại"],
  ["DEMO-TL-008", "hết hạn"],
  ["DEMO-TL-007", "thu hồi"],
]) {
  test(`Không truy xuất tài liệu ${label}`, async ({ page }) => {
    await start(page, "/tai-lieu/" + id, "employee");
    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Tài liệu không khả dụng" }),
    ).toBeVisible();
    await expect(
      dialog.getByText(/SAP-A-1005|0900000000|10 ngày làm việc/),
    ).toHaveCount(0);
  });
}

test("Che PII → rà soát → xuất bản → nhân viên đọc/ký; thay phiên bản loại nguồn cũ", async ({
  page,
}) => {
  await start(page, "/quan-tri-tai-lieu/DEMO-TL-006", "docs");
  for (const label of [
    "Che thông tin cá nhân",
    "Xác nhận rà soát",
    "Xuất bản và lập chỉ mục",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await confirm(page);
  }
  expect(
    (await state(page)).documents.find((d) => d.id === "DEMO-TL-006")!.status,
  ).toBe("published");
  await close(page);
  await role(page, "employee");
  await page.goto("/tai-lieu/DEMO-TL-006");
  await expect(page.getByRole("dialog")).toContainText("[ĐÃ CHE");
  await expect(page.getByRole("dialog")).not.toContainText("0900000000");
  await page.getByRole("button", { name: "Xác nhận đã đọc" }).click();
  await confirm(page);
  expect(
    (await state(page)).documents.find((d) => d.id === "DEMO-TL-006")!
      .signatures,
  ).toHaveLength(1);
  await close(page);
  await role(page, "docs");
  await page.goto("/quan-tri-tai-lieu/DEMO-TL-002");
  for (const label of [
    "Tạo phiên bản mới",
    "Xác nhận rà soát",
    "Xuất bản và lập chỉ mục",
  ]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await confirm(page);
  }
  await close(page);
  await role(page, "employee");
  await page.goto("/tai-lieu/DEMO-TL-002?version=2#muc-2");
  await expect(
    page.getByRole("heading", { name: "Tài liệu không khả dụng" }),
  ).toBeVisible();
  await page.goto("/tai-lieu/DEMO-TL-002?version=3#muc-2");
  await expect(page.getByRole("dialog")).toContainText("Phiên bản 3");
});
