import { test, expect, start } from "./fixtures";
import { createSeed } from "../../src/data/seed";
import { workbookFixture } from "../helpers/workbook-fixture";

test("Excel cục bộ: giữ mã nguồn, tra chi tiết và chuyển phân hệ", async ({
  page,
}, info) => {
  const fixture = createSeed();
  fixture.workbookData = workbookFixture();
  await start(page, "/dong-phuc/du-lieu-excel", "hc", fixture);
  await page.getByLabel("Tìm trong Dữ liệu Excel cục bộ").fill("000123");
  await expect(page.getByRole("table")).toContainText("Người tổng hợp 001");
  await page.getByRole("button", { name: "Xem chi tiết" }).click();
  await expect(page.getByRole("dialog")).toContainText("PR-SYNTHETIC-01");
  await page.screenshot({
    path: info.outputPath("workbook-uniform-details.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Đóng hộp thoại" }).click();
  await page.getByRole("link", { name: "Tủ đồ", exact: true }).click();
  await expect(page).toHaveURL(/view=excel/);
  await expect(page.getByRole("table")).toContainText("A001");
  await page.getByRole("tab", { name: /Tình trạng lỗi nguồn/ }).click();
  await expect(page.getByRole("table")).toContainText("Lỗi khóa tổng hợp");
  await page.screenshot({
    path: info.outputPath("workbook-locker-faults.png"),
    fullPage: true,
  });
});
test("Excel cục bộ: trợ lý đọc đúng dòng nguồn và mở nguồn trong ứng dụng", async ({
  page,
}) => {
  const fixture = createSeed();
  fixture.workbookData = workbookFixture();
  await start(page, "/dong-phuc/du-lieu-excel", "hc", fixture);
  await page.getByRole("button", { name: "Trợ lý demo" }).click();
  await page
    .getByLabel("Câu hỏi cho trợ lý")
    .fill("Lịch sử Excel Người tổng hợp 001");
  await page.getByRole("button", { name: "Gửi câu hỏi" }).click();
  const article = page.getByRole("article").last();
  await expect(article).toContainText("000123");
  await article.getByRole("link", { name: /Người tổng hợp 001/ }).click();
  await expect(
    page.getByRole("dialog", { name: "Chi tiết dòng Excel" }),
  ).toContainText("000123");
  await page.reload();
  await expect(
    page.getByRole("dialog", { name: "Chi tiết dòng Excel" }),
  ).toContainText("000123");
});
