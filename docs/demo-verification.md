# Kiểm chứng trình diễn — phase 5

Ngày 10/11/2026. Thực hiện `prompts/prompt5.md` trên ứng dụng hiện có, dùng AGENTS.md, proposal.md được người dùng xác nhận và các tài liệu phase trước. Không thay kiến trúc hoặc tích hợp thật. Báo cáo này thay các con số QA hiện hành trong báo cáo phase 4/4.5; các báo cáo cũ vẫn là lịch sử tại thời điểm tương ứng.

## Đã chuẩn bị

- Trang `/trinh-dien`, đường vào từ điều hướng và Tổng quan; năm hướng dẫn định sẵn với thời lượng, vai trò, dữ liệu đầu và kết quả. Kiểm tra điều kiện qua selector hiện hành; mở chỉ đổi vai trò/trang, không tự thực hiện giao dịch.
- Nạp seed mới phải qua tài khoản Quản trị và hộp xác nhận mất thay đổi. Hủy giữ dữ liệu. Không sửa dữ liệu đã lưu chỉ vì mở trang/cập nhật code. Giữ schema v2/migration cũ.
- Seed canonical tổng hợp có đủ các tình huống từ phase 4.5. Bổ sung hai tòa tủ A/B, ba tầng; giữ 60 tủ, 37 trống và ID cũ. SKU-2-2 cố ý chưa có mapping; 21 mapping khác giữ xác nhận, 44 mã NCC vẫn hư cấu.
- Giao diện dùng thiết kế hiện có: bảng 13px, tiêu đề/metadata 12px với màu dễ đọc hơn, điều hướng có cuộn ở chiều cao thấp, thẻ kịch bản hai cột/desktop và một cột/mobile. Hướng dẫn chi tiết đóng gọn mặc định để giữ chỗ cho biểu mẫu. UI/UX Pro Max được dùng để rà soát table handling, line height, contrast và responsive; đây là rà soát source, chưa phải xác nhận qua ảnh.
- Tài liệu đủ: [script 10 phút](demo-guide.md), [dữ liệu hư cấu](demo-data.md), [giới hạn mô phỏng/sản xuất](limitations.md). Không có workbook trong tài nguyên build.

## Kết quả thực thi cuối

`npm run test:qa`: **14:25:45–14:26:02 UTC ngày 10/11/2026** (21:25:45–21:26:02 giờ địa phương UTC+7). Artifact tại `output/qa/summary.json`, `vitest.json`, logs; báo cáo Playwright tại `output/playwright/report.json` và `html/`. Đây là file sinh khi chạy, không là dữ liệu ứng dụng.

| Kiểm tra                                          | Kết quả                                                                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| TypeScript, gồm E2E specs                         | Qua, exit 0                                                                                                 |
| Production build Vite                             | Qua, exit 0                                                                                                 |
| Vitest + React Testing Library                    | **155 qua / 0 thất bại / 0 bỏ qua**, 16 tệp test                                                            |
| Prettier source/tests/tài liệu được sửa           | Qua                                                                                                         |
| Cú pháp runner QA (`node --check`)                | Qua                                                                                                         |
| Playwright discovery                              | 24 kịch bản × desktop/mobile = **48 ca đăng ký**                                                            |
| Playwright chạy toàn suite                        | Exit 1, `config.webServer` không khởi động; **0 qua / 0 ca hành vi thất bại / 0 bỏ qua / 48 chưa thực thi** |
| Khởi động dev server                              | Exit 1: `listen EPERM 127.0.0.1:5173`                                                                       |
| Khởi động production preview trực tiếp            | Exit 1: `listen EPERM 127.0.0.1:4173`                                                                       |
| Browser journeys đã xác minh / screenshot thực tế | **0 / 0**                                                                                                   |

Lệnh QA tổng hợp trả **exit 1**, status **incomplete**, Playwright **blocked**. Không khẳng định ứng dụng đã khởi động HTTP thành công trong môi trường này hoặc sẵn sàng live demo. Log preview thực tế lưu `output/qa/preview-phase5-attempt.log`. Không dùng route interception, server giả hoặc ảnh dựng để bỏ qua lỗi.

Vitest mới: `src/domain/demo-scenarios.test.ts` có 4 ca kiểm điểm đầu/không mutation, nhóm quota/giá, PR thiếu hụt và điều kiện thay đổi. `src/test/demo.test.tsx` có 2 ca: reset hủy/xác nhận, chuyển vai trò/trang không ghi nghiệp vụ; và **chạy cả năm kịch bản liên tục qua giao diện React trên một state**, kiểm tra cuối ledger/giá/quota/PR/nguồn/cấp tủ/mapping/audit và hydrate. Các kiểm thử cũ cũng chạy toàn bộ. Đây là jsdom/RTL, không thay bằng chứng trình duyệt.

## Năm kịch bản và kết quả được kiểm tra

| Kịch bản                       | Điểm đầu được kiểm tra                                     | Kết quả đã đạt trong Vitest/RTL                                                                                            | Playwright desktop/mobile  |
| ------------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| 1. Khoa xin đồng phục cho nhóm | NV031 còn 1; NV035/NV036 đủ quota; hai SKU có tồn          | Một hồ sơ 3 người qua head/admin/warehouse; NV031 đạt 3; nurse M 8 vật lý/2 giữ/6 khả dụng; giá lịch sử 260.000 giữ nguyên | Đã tạo, **2 ca chưa chạy** |
| 2. Thiếu hàng → PR             | DEMO-YC-002 thiếu 2 bác sĩ XL, chưa PR liên kết            | PR nháp đúng nguồn/lượng; ngân sách lưu; tồn vẫn 0, không tạo PO/receipt tự động                                           | Đã tạo, **2 ca chưa chạy** |
| 3. Hỏi hợp đồng và mở nguồn    | Buyer đọc được DEMO-TL-004 v1 mục 2                        | Trợ lý có citation đúng URL/version/mục, mở nội dung 10 ngày làm việc; không ghi business state                            | Đã tạo, **2 ca chưa chạy** |
| 4. Phân bổ nhóm tủ             | 37 trống; NV001/002/003 chưa có tủ                         | Xem trước không ghi; xác nhận còn 34 trống, ba tủ riêng và audit; persistence đúng                                         | Đã tạo, **2 ca chưa chạy** |
| 5. Xác nhận mã SAP             | DP-KT-L chưa mapping; A1010 100%, B2010 80% khác chất liệu | Người mua xác nhận đúng A1010/Cotton/cỡ L, lưu lý do/audit và hydrate                                                      | Đã tạo, **2 ca chưa chạy** |

`tests/e2e/demo.spec.ts` có 5 kịch bản riêng, mỗi kịch bản mở trang trình diễn và reset bằng UI trước khi bắt đầu, kiểm tra seed và việc mở không đổi business state. `npm run test:e2e:demo` chạy 10 ca trên hai viewport. Toàn suite 48 ca bao gồm 38 ca từ các phase trước. Fixture chỉ khởi tạo trước load, không sửa state giữa hành trình để làm giả kết quả. Fixture health kiểm console/pageerror/network khi browser chạy được.

## Bằng chứng ảnh và rà soát thị giác

Chưa chụp được ảnh nên **chưa thể kiểm tra thực tế clipping, whitespace, bảng, responsive, focus/touch hay console/network qua Chromium**. Những tinh chỉnh CSS nêu trên chỉ có kiểm tra source và build. Bộ chụp đã được bổ sung để chạy lại, không có placeholder hoặc ảnh giả:

| Màn hình yêu cầu           | Tên ảnh khi thực sự chạy được                                                      |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Dashboard                  | `tong-quan.png`                                                                    |
| Uniform Management         | `dong-phuc.png`                                                                    |
| Document Lookup            | `tai-lieu.png`                                                                     |
| Locker Management          | `tu-do.png`                                                                        |
| Purchase Support           | `mua-sam.png`                                                                      |
| Shared AI assistant        | `tro-ly.png`, `tro-ly-landscape.png`                                               |
| Approval workflow          | `luong-phe-duyet.png`, `demo-1-tien-trinh-duyet.png`                               |
| Hướng dẫn/chi tiết bổ sung | `kich-ban-trinh-dien.png`, ảnh PR/citation/xem trước tủ/ứng viên NCC trong từng ca |

Khi thực thi thành công, ảnh dưới `output/playwright/screenshots/{desktop,mobile}/`; trace/ảnh lỗi dưới `output/playwright/results/`. Hiện số ảnh của lần chạy cuối bằng **0**. Không kết luận thị giác đạt chỉ vì framework nhận spec hoặc TypeScript biên dịch được.

## Hoàn tất kiểm chứng ở máy chạy demo

1. Dùng môi trường cho phép HTTP localhost và Chromium. `npm ci` nếu máy mới, `npx playwright install chromium`, sau đó `npm run test:qa` (framework tự mở preview). Nếu chỉ kiểm nhóm demo: build trước, rồi `npm run test:e2e:demo`.
2. Xem JSON/HTML để chắc chắn các ca thực sự có `application-loaded`, không chỉ discovery. Mở các ảnh desktop/mobile ở bảng trên; kiểm clipping, bảng đọc được, menu ở màn hình thấp, hướng dẫn không lấn biểu mẫu, focus và nhãn mô phỏng. Sửa lỗi rồi chạy lại ca liên quan nếu có.
3. Diễn tập một lượt liên tục theo script 10 phút trên seed mới, qua vai trò đúng và không sửa DevTools. Kiểm tra các con số đầu/cuối trên UI. Sau đó mới chốt đủ điều kiện trình diễn trực tiếp.

Các giới hạn production vẫn áp dụng ngay cả khi E2E sau này qua: RBAC/audit/localStorage chỉ mô phỏng, không chứng minh bảo mật hoặc khả năng tích hợp sản xuất.
