import {
  test,
  expect,
  start,
  state,
  role,
  close,
  confirm,
  dossierAction,
} from "./fixtures";

test("Gửi yêu cầu, duyệt hai bên, bàn giao, lịch sử/báo cáo/nhật ký và tải lại", async ({
  page,
}) => {
  await start(page, "/dong-phuc/yeu-cau", "coord");
  await page.getByRole("button", { name: "Lập yêu cầu", exact: true }).click();
  await page.getByLabel("Nhân viên dòng 1").selectOption("DEMO-NV-031");
  await page.getByLabel("Mã đồng phục dòng 1").selectOption("SKU-1-1");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const id = (await state(page)).uniforms.at(-1)!.id;
  const url = "/dong-phuc/yeu-cau/" + id;
  await page.goto(url);
  await page.getByRole("button", { name: "Gửi duyệt yêu cầu" }).click();
  await confirm(page);
  expect((await state(page)).uniforms.at(-1)!.status).toBe("pending");
  await close(page);
  await role(page, "employee");
  await page.goto(url);
  await expect(
    page.getByRole("button", { name: "Duyệt yêu cầu", exact: true }),
  ).toHaveCount(0);
  expect((await state(page)).uniforms.at(-1)!.decisions).toHaveLength(0);
  await dossierAction(page, url, "head", "Duyệt yêu cầu");
  await dossierAction(page, url, "hc", "Duyệt yêu cầu");
  expect((await state(page)).uniforms.at(-1)!.status).toBe("reserved");
  await dossierAction(page, url, "warehouse", "Xác nhận bàn giao");
  const s = await state(page);
  expect(s.uniforms.at(-1)!.status).toBe("issued");
  expect(
    s.issuances
      .filter((i) => i.employeeId === "DEMO-NV-031")
      .reduce((n, i) => n + i.quantity, 0),
  ).toBe(3);
  expect(
    s.audits.some((a) => a.entityId === id && a.action === "uniform.issue"),
  ).toBe(true);
  await page.reload();
  expect((await state(page)).uniforms.at(-1)!.status).toBe("issued");
  await close(page);
  await page.goto("/dong-phuc/kho");
  await page.getByLabel("Tìm trong Danh mục đồng phục").fill("DP-DD-M");
  const row = page.getByRole("row").filter({ hasText: "DP-DD-M" });
  await expect(row.getByText("9", { exact: true })).toBeVisible();
  await expect(row.getByText("7 bộ", { exact: true })).toBeVisible();
  await page.goto("/dong-phuc/nhan-vien");
  await page
    .getByLabel("Tìm trong Nhân viên", { exact: true })
    .fill("DEMO-NV-031");
  await page.getByRole("button", { name: "Lịch sử cấp", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByText("260.000 ₫", { exact: true }),
  ).toBeVisible();
  await close(page);
  await page.goto("/dong-phuc/bao-cao");
  await page.getByLabel("Khoa báo cáo", { exact: true }).selectOption("NOI");
  await expect(page.locator(".summary-strip")).toContainText(
    "3 bộ đã bàn giao",
  );
  await page.goto("/nhat-ky");
  await page.getByLabel("Tìm trong Nhật ký", { exact: true }).fill(id);
  await expect(
    page.getByRole("row").filter({ hasText: "Bàn giao đồng phục" }),
  ).toBeVisible();
});

test("Định mức vượt bị chặn, biểu mẫu giữ dữ liệu và không thay tồn", async ({
  page,
}) => {
  await start(page, "/dong-phuc/yeu-cau", "coord");
  await page.getByRole("button", { name: "Lập yêu cầu", exact: true }).click();
  await page.getByLabel("Nhân viên dòng 1").selectOption("DEMO-NV-031");
  await page.getByLabel("Mã đồng phục dòng 1").selectOption("SKU-1-1");
  await page.getByLabel("Số bộ dòng 1").fill("2");
  await page.getByRole("button", { name: "Lưu bản nháp" }).click();
  const id = (await state(page)).uniforms.at(-1)!.id;
  await page.goto("/dong-phuc/yeu-cau/" + id);
  await page.getByRole("button", { name: "Gửi duyệt yêu cầu" }).click();
  await confirm(page);
  await expect(page.getByRole("alert")).toContainText(
    "Vượt định mức: đã cấp 2",
  );
  expect((await state(page)).uniforms.at(-1)!.status).toBe("draft");
});

test("Thiếu đồng phục → PR → ba bên duyệt → PO → nhận kho → cấp phát", async ({
  page,
}) => {
  await start(page, "/dong-phuc/yeu-cau/DEMO-YC-002", "coord");
  await expect(page.getByRole("dialog")).toContainText("Chờ bổ sung");
  await close(page);
  await role(page, "buyer");
  await page.goto("/mua-sam/nhu-cau");
  await page.getByRole("button", { name: "Tạo bản nháp mua" }).click();
  await page.getByRole("button", { name: "Lưu đề nghị nháp" }).click();
  const pid = (await state(page)).purchases.at(-1)!.id,
    url = "/mua-sam/de-nghi/" + pid;
  await page.goto(url);
  await page.getByRole("button", { name: "Gửi duyệt đề nghị" }).click();
  await confirm(page);
  await expect(
    page.getByRole("button", { name: "Tạo PO SAP mô phỏng" }),
  ).toHaveCount(0);
  for (const a of ["hc", "finance", "leader"])
    await dossierAction(page, url, a, "Duyệt đề nghị");
  await dossierAction(page, url, "buyer", "Tạo PO SAP mô phỏng");
  const oid = (await state(page)).orders.at(-1)!.id;
  // PO creates no receipt or stock movement.
  expect(
    (await state(page)).receipts.filter((r) => r.orderId === oid),
  ).toHaveLength(0);
  await close(page);
  await role(page, "warehouse");
  await page.goto("/mua-sam/don-hang/" + oid);
  await page.getByRole("button", { name: "Lập phiếu nhận hàng" }).click();
  await page.getByRole("button", { name: "Xác nhận nhận và tăng kho" }).click();
  expect((await state(page)).orders.at(-1)!.status).toBe("received");
  await dossierAction(
    page,
    "/dong-phuc/yeu-cau/DEMO-YC-002",
    "coord",
    "Gửi duyệt yêu cầu",
  );
  await dossierAction(
    page,
    "/dong-phuc/yeu-cau/DEMO-YC-002",
    "head",
    "Duyệt yêu cầu",
  );
  await dossierAction(
    page,
    "/dong-phuc/yeu-cau/DEMO-YC-002",
    "hc",
    "Duyệt yêu cầu",
  );
  await dossierAction(
    page,
    "/dong-phuc/yeu-cau/DEMO-YC-002",
    "warehouse",
    "Xác nhận bàn giao",
  );
  const s = await state(page);
  expect(s.uniforms.find((r) => r.id === "DEMO-YC-002")!.status).toBe("issued");
  expect(s.issuances.find((i) => i.requestId === "DEMO-YC-002")).toMatchObject({
    employeeId: "DEMO-NV-033",
    quantity: 2,
    price: 420000,
  });
  const lots = s.lots.filter((l) => l.skuId === "SKU-0-3").map((l) => l.id);
  expect(
    s.movements
      .filter((m) => lots.includes(m.lotId))
      .reduce((n, m) => n + m.quantity, 0),
  ).toBe(0);
});

test("Tìm mã SAP chính xác/gần mô tả và xác nhận sai khác có lý do", async ({
  page,
}) => {
  await start(page, "/mua-sam/nha-cung-cap", "buyer");
  await page.getByLabel("Mã nội bộ cần đối sánh").selectOption("SKU-1-1");
  await page.getByLabel("Tra theo mã SAP / tên sản phẩm").fill("SAP-A-1005");
  await expect(
    page.getByRole("row").filter({ hasText: "SAP-A-1005" }),
  ).toContainText("100%");
  await page.getByLabel("Tra theo mã SAP / tên sản phẩm").fill("bộ điều dưỡng");
  const candidate = page.getByRole("row").filter({ hasText: "SAP-B-2005" });
  await expect(candidate).toContainText("Khác chất liệu");
  await candidate
    .getByRole("button", { name: "Xác nhận đối sánh", exact: true })
    .click();
  await page
    .getByLabel("Lý do / ghi chú")
    .fill("Chấp nhận chất liệu mẫu sau đối chiếu");
  await confirm(page);
  expect(
    (await state(page)).mappings.find((m) => m.skuId === "SKU-1-1")!.productId,
  ).toBe("SP-B-SKU-1-1");
});
