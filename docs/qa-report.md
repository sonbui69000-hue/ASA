# Báo cáo QA — prompt 4

> Đây là kết quả lịch sử của phase 4. Kết quả hiện hành ở [demo-verification.md](demo-verification.md) (phase 5); báo cáo [phase 4.5](excel-alignment-report.md#9-kiểm-tra-thực-tế-ngày-10112026) cũng được giữ để truy vết. Các con số 126/34 bên dưới không phải kết quả hiện hành.

Ngày kiểm tra: 10/11/2026. Nguồn yêu cầu là proposal.md đã được người dùng xác nhận, AGENTS.md, prompt4.md và các tài liệu lập kế hoạch. Giữ nguyên dự án, dữ liệu tổng hợp và kiến trúc dịch vụ dùng chung; không gọi API SAP/LLM thật, không triển khai prompt tiếp theo.

**Trạng thái QA: chưa thể chốt sẵn sàng trình diễn trực tiếp.** Các kiểm tra logic, giao diện React, TypeScript và build chạy được. Môi trường chặn mở cổng HTTP cục bộ nên bộ Playwright chưa thực thi hành trình nào. Không dùng kết quả build hoặc RTL để thay thế bằng chứng trình duyệt.

## Phần đã triển khai và sửa lỗi

Bốn phân hệ Đồng phục, Tài liệu, Tủ đồ, Mua sắm và trợ lý dùng cùng DemoStore/localStorage. Trợ lý đọc dữ liệu hiện hành, có nguồn, giữ hội thoại trong phiên theo tài khoản và mở biểu mẫu để người có quyền xác nhận. Phân quyền là mô phỏng phía trình duyệt, không cung cấp bảo mật sản xuất.

QA đã tái hiện bằng kiểm thử thất bại trước khi sửa và chạy lại kiểm thử liên quan cho các lỗi sau:

| Lỗi                                                                             | Thay đổi                                                                                                                                                                        | Bằng chứng hồi quy                                                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Nhân viên thấy người khác dùng tủ cùng khoa; tủ trả lại làm lộ lịch sử người cũ | Dùng `canReadLocker` và `lockerEventsFor` để áp phạm vi người nhận; lịch sử giữ phạm vi riêng dù tủ đã trống. Dùng cùng quy tắc trong module, tìm kiếm toàn ứng dụng và trợ lý. | Hai ca RTL về tủ đang dùng và tủ đã trả; quyền assistant đã có trong suite                           |
| Mã hàng trùng khi nhập khoảng trắng/khác hoa thường                             | Chuẩn hóa mã trước khi kiểm tra trùng và lưu                                                                                                                                    | Ca service sửa mã bác sĩ thành mã điều dưỡng với khoảng trắng/hoa thường                             |
| Vị trí tủ trùng do khoảng trắng/hoa thường/số 0 đầu                             | So sánh vị trí chuẩn hóa, đối chiếu số tủ tương đương; cắt khoảng trắng khi lưu                                                                                                 | Ca service tạo vị trí tương đương tủ 01 hiện có                                                      |
| Bản tài liệu superseded có thể bị sửa thành draft                               | Dịch vụ từ chối sửa bản đã thu hồi/đã thay thế                                                                                                                                  | Ca tạo v3, xuất bản rồi thử sửa bản v2 đã thay thế                                                   |
| Mô tả rút gọn/đảo từ không tìm được sản phẩm                                    | Adapter và shortlist cùng tìm từng từ không dấu, không phụ thuộc thứ tự; mã trả về luôn từ catalog                                                                              | Mã SAP chính xác; “bộ điều dưỡng”/“điều dưỡng bộ”; ứng viên khác chất liệu điểm 80 cần xác nhận      |
| PII tổng hợp ở tiêu đề tài liệu/mục có thể lọt qua rà soát                      | Che/kiểm tra cả tiêu đề và các mục, giữ bản gốc trong vùng rà soát; thay tiêu đề làm mất review; kiểm tra lại khi xuất bản                                                      | Ca tiêu đề có tên demo và tiêu đề mục có email tổng hợp, chặn trước che rồi cho phép sau che/rà soát |

Không phát hiện lỗi nghiệp vụ còn thất bại trong bộ kiểm thử đã chạy. Điều này không khẳng định đã loại hết lỗi trình duyệt hoặc đạt bảo mật sản xuất. Che PII dùng quy tắc minh họa trên dữ liệu tổng hợp, vẫn có bước con người rà soát.

## Bộ kiểm tra và phạm vi

`tests/e2e/` chứa 17 kịch bản Playwright Test cố định, chạy lại trên desktop 1440×1000 và thiết bị mô phỏng Pixel 7: **34 ca đăng ký**. Cấu hình dùng production preview thật tại `127.0.0.1:4173`; không `route.fulfill`, không stub dịch vụ và không sửa state giữa hành trình. Fixture trùng tên chỉ nạp bộ dữ liệu tổng hợp trước khi ứng dụng khởi động. Mỗi ca có context trình duyệt riêng.

| Nhóm       | Kiểm tra đã chạy bằng Vitest/RTL                                                                                                                                                                  | Kịch bản Playwright đã tạo, chưa chạy được                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Đồng phục  | Quota/cam kết, thiếu hàng, giữ/bàn giao/hủy/trả, giá lịch sử; workflow UI thiếu → PR → ba bên duyệt → PO → nhập → gửi lại/duyệt/cấp; báo cáo theo mã và nhật ký                                   | Gửi/cấp phát, chặn quota, tồn sau bàn giao, lịch sử, báo cáo, nhật ký, reload                                     |
| Tài liệu   | Tìm nội dung/tên, ACL, phiên bản, PII kể cả tiêu đề, review/publish, thu hồi, hết hạn, không tồn tại, citation/đổi quyền đang mở                                                                  | Mở kết quả/citation, bốn loại nguồn không khả dụng, che/xuất bản/ký, thay phiên bản                               |
| Tủ đồ      | Phân bổ nhiều tủ, preview không ghi, giữ/chuyển/trả, chống trùng, lịch sử và phạm vi vai trò                                                                                                      | Phân bổ nhiều, không cho chọn người đã có tủ, chặn chuyển trùng, trả/lịch sử, đổi vai trò                         |
| Mua sắm    | Catalog chính xác/gần mô tả, mapping cần xác nhận, draft/submit, trần 40%, duyệt độc lập, PO không tăng tồn, lỗi adapter, nhận một phần/idempotency, lịch sử                                      | Tạo PR/duyệt/PO/nhận liên kết đồng phục; tìm mã và xác nhận khác chất liệu                                        |
| Trợ lý     | Bảng 49 câu tiếng Việt, tham số thiếu/mơ hồ, tên trùng, quyền, citation, biến động kho/tủ/phê duyệt, điều hướng và lỗi/thử lại                                                                    | Hỏi bốn module, cập nhật sau kiểm kê, nguồn, thiếu tham số, mơ hồ sản phẩm/nhân viên, đổi vai trò, giữ hội thoại  |
| Dùng chung | Điều hướng trang chính, tìm kiếm/sắp xếp/phân trang thành phần, form validation, KPI giảm từ 37 xuống 36 sau phân bổ, reset có xác nhận, hydrate/persistence, lỗi localStorage, revision xung đột | Điều hướng URL/tab, lọc/sắp xếp, reload, reset, quyền, console/request errors, tràn ngang, ảnh portrait/landscape |

Các ca mới ở `src/domain/qa-regressions.test.ts` và `src/test/qa.test.tsx`. Các test hiện có vẫn được chạy đầy đủ. Workflow RTL bổ sung chỉ thao tác qua giao diện; kiểm tra cuối cùng ledger, lịch sử, báo cáo, audit và bản state hydrate từ localStorage.

## Kết quả thực thi cuối

Số liệu được chốt từ lần chạy cuối của `npm run test:qa`, lưu tại `output/qa/summary.json`; không lấy số ca từ lệnh liệt kê làm số ca đã qua. Kết quả chi tiết Vitest ở `output/qa/vitest.json`; Playwright ở `output/playwright/report.json` và `output/playwright/html/index.html`.

| Kiểm tra                       | Qua |     Thất bại | Bỏ qua | Không thực thi |
| ------------------------------ | --: | -----------: | -----: | -------------: |
| Vitest + React Testing Library | 126 |            0 |      0 |              0 |
| Playwright desktop/mobile      |   0 | 0 ca hành vi |      0 |             34 |

Tổng cộng **126 ca qua, 0 ca hành vi thất bại, 0 ca bỏ qua và 34 ca chưa thực thi**. Toàn bộ 12 tệp Vitest/RTL được chạy. TypeScript (gồm cấu hình/spec E2E), Vite production build, kiểm tra Prettier, cú pháp runner QA và cây dependency (`npm ls --depth=0`) đều qua. `npm run test:qa` vẫn trả exit 1 và trạng thái `incomplete` vì bước Playwright bị chặn.

Lệnh Playwright **trả exit 1** do `config.webServer` không khởi động được, không phải suite thành công. Đã thử cả Vite dev và production preview: `listen EPERM` tại `127.0.0.1:5173` và `127.0.0.1:4173`. Log nguyên nhân ở `output/qa/preview-attempt.log`; lỗi framework ở báo cáo Playwright. Không có hành trình browser thực tế, không có kết luận “không lỗi console/network” trên Chromium.

**Ảnh đã chụp: 0.** Khi chạy được, test chụp tổng quan, bốn module, trợ lý và trợ lý landscape vào `output/playwright/screenshots/{desktop,mobile}/`; trace/ảnh lỗi nằm ở `output/playwright/results/`. Hiện chưa có ảnh xác minh để bàn giao.

## Giới hạn còn lại

- Chưa kiểm chứng browser desktop/mobile, bố cục responsive, tràn ngang, focus/touch thực tế, console/network, tải CSV và các thao tác qua trình duyệt thật.
- Chưa chạy được reload/persistence/reset qua Chromium; đã kiểm logic lưu/hydrate/reset và giao diện React bằng Vitest/RTL.
- Cần chạy lại toàn bộ E2E trong môi trường cho phép mở cổng cục bộ và chạy Chromium, sửa bất kỳ lỗi nào phát sinh, rồi mới chốt trình diễn. Suite hiện đã được biên dịch TypeScript và framework nhận đủ 34 ca; điều đó chưa chứng minh các ca sẽ qua.

## Chạy dự án và QA

```bash
npm ci
npm run dev
# Mở http://127.0.0.1:5173

npm run typecheck
npm run build
npm run test
npx playwright install chromium
npm run test:e2e

# Hoặc tổng hợp kiểm tra, có JSON và exit code trung thực
npm run test:qa
```

`test:e2e` tự mở/tắt preview trên cổng 4173. Có thể chỉ định browser đã cài bằng `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. `npm run test:e2e:list` chỉ liệt kê; `npm run test:e2e:assistant` chỉ chạy hai kịch bản trợ lý trên hai viewport. Runner legacy từ phase trước vẫn được giữ, không dùng thay kiểm tra server thật của phase này. `test:qa` trả exit 1 nếu có lỗi hoặc E2E bị chặn.

## Kịch bản trình diễn đề xuất

1. Quản trị → khôi phục dữ liệu. Điều phối Nội tạo 1 bộ `DP-DD-M` cho NV031, gửi, Trưởng khoa/Hành chính duyệt, Thủ kho bàn giao. Đối chiếu lịch sử 3 bộ và giá lô; thử xin 2 bộ để thấy chặn quota.
2. Với `DEMO-YC-002` chờ 2 bộ bác sĩ XL, Mua sắm tạo PR từ nhu cầu, ba bên duyệt, tạo PO mô phỏng. Thủ kho nhận rồi Điều phối gửi lại; duyệt/cấp và kiểm tồn, báo cáo, nhật ký.
3. Quản lý tài liệu che/rà soát/xuất bản `DEMO-TL-006`; Nhân viên đọc/ký. Đổi sang Mua sắm để hỏi hợp đồng, trở lại Nhân viên để thấy quyền bị chặn; thử citation phiên bản cũ sau thay thế.
4. Hành chính phân bổ 2 tủ cho NV001/NV002, xem KPI và lịch sử, thử chuyển trùng rồi trả tủ. Đổi Nhân viên để kiểm tra phạm vi.
5. Hỏi trợ lý tồn `DP-DD-M`, tủ tầng 3 rồi “Còn tầng 2 thì sao?”, mã SAP, định mức có citation; điều chỉnh kho bằng Thủ kho rồi mở lại chat để thấy số mới. Kết thúc bằng reset có xác nhận.
