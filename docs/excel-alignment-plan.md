# Kế hoạch đối chiếu và triển khai — phase 4.5

Đọc cùng [excel-alignment-report.md](excel-alignment-report.md). Báo cáo và kế hoạch được tạo trước thay đổi mã ứng dụng. Thực hiện các thay đổi có bằng chứng bên dưới, không chờ phê duyệt cho lựa chọn tương thích/an toàn; không thực hiện prompt 5.

| Area           | Current implementation                                    | Excel evidence                                             | Proposed change                                                                                                                       | Priority    |
| -------------- | --------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Nhân viên      | Chức danh/khoa, thiếu giới tính                           | S01 H; S03 D                                               | Thuộc tính gender nam/nữ/chưa cập nhật; form quản trị, danh bạ; không suy từ tên                                                      | Cao         |
| Biến thể hàng  | Category+size, seed S/M/L/XL                              | S01 D/H/J/P/Q; cỡ chữ mở rộng/cỡ số                        | Category+gender+size, cỡ chuẩn hóa và alias, ID cũ ổn định; thêm SKU demo                                                             | Cao         |
| Điều kiện cấp  | Chức danh/quota                                           | Có thuộc tính nhưng không có policy matrix                 | Giữ quota/chức danh; SKU dùng chung tương thích cũ, biến thể cấu hình nam/nữ kiểm tra cùng service và UI                              | Cao         |
| Kho và history | Ledger/lô/giá bất biến                                    | Yêu cầu/cấp, ngày và số lượng tách biệt                    | Giữ ledger; lọc biến thể/cỡ; hiển thị lượng yêu cầu/đã cấp, ngày và lần cấp gần nhất; không nhập lại số dư                            | Cao         |
| PR/PO liên kết | FK đã có nhưng hồ sơ yêu cầu chưa hiển thị toàn tuyến     | S01 N/O PR/PO                                              | Selector chứng từ liên quan theo quyền, links hồ sơ thật                                                                              | Cao         |
| Metadata mua   | Chưa có ngân sách/khoa/tháng                              | S02 I/J/K/L                                                | Context tùy chọn ngân sách/mã/khoa/tháng dự kiến; snapshot PO, report chi phí và CSV theo bộ lọc                                      | Cao         |
| Tính tiền      | Giá dòng/giá lô                                           | S02 H=G×E                                                  | Tính tự động, báo cáo không nhập tay thành tiền; giữ giá cũ khi đổi giá danh mục                                                      | Cao         |
| Đối sánh mã    | Category/size/material                                    | Hai sheet có mã/tên không cùng khóa trực tiếp              | Thêm gender và size alias vào so khớp; không xác nhận sai thông số; luôn xác nhận thủ công khi cần                                    | Cao         |
| Seed           | Chưa có giao dịch mua khởi tạo hoặc người đã cấp đủ quota | Nhiều dạng bản ghi/cỡ; đề bài phase 4.5 yêu cầu edge cases | Mở rộng canonical seed hư cấu: XS/XXL/3XL/cỡ số, đủ/thiếu tồn, người đủ quota, PR pending và PO received; không sao chép giá/mã nguồn | Cao         |
| Persistence    | schemaVersion 1, khóa localStorage v1                     | Cần giữ demo người dùng                                    | schemaVersion 2 cùng khóa cũ; migration defaults an toàn, validate trước commit; lỗi không ghi đè; reset rõ ràng                      | Cao         |
| Trợ lý         | Nhận cỡ S–XL; giới tính chỉ cảnh báo thiếu thuộc tính     | S01 H/J; PR/PO và ngân sách                                | Extract giới tính/cỡ chữ-số; lọc cùng SKU, dẫn nguồn state, báo cáo trạng thái và metadata                                            | Cao         |
| Đơn vị         | Chỉ bộ                                                    | S02 cái/đôi, không có conversion                           | Chưa nhập nhóm đơn vị khác; giữ 3 bộ/40%; câu hỏi quy đổi để xác nhận                                                                 | Giữ phạm vi |
| Duyệt/tái cấp  | Workflow/quota cấu hình                                   | Footer xác nhận, không có quy tắc/thứ tự/tái cấp           | Không suy từ màu, chữ ký mẫu hoặc ngày gần nhất; giữ workflow                                                                         | Giữ nguyên  |
| Tài liệu/tủ    | Đang hoạt động                                            | Không có bằng chứng liên quan trong workbook này           | Không sửa hai module                                                                                                                  | Giữ nguyên  |

## Trình tự triển khai

1. Lưu bằng chứng cấu trúc đã lọc; bảo vệ workbook bằng .gitignore; không tạo CSV dòng gốc.
2. Mô hình và migration v2; test dữ liệu cũ, giữ ID/lịch sử/giá, storage lỗi và version không tương thích.
3. Quy tắc/selector dùng chung cho gender/size, chứng từ liên quan, báo cáo mua; cập nhật seed và test business invariant. Không tự nạp seed mở rộng vào localStorage đã có dữ liệu.
4. UI đồng phục/mua sắm/nhân viên theo design system hiện có, cập nhật trợ lý; cùng service validation, không API thật.
5. Vitest/RTL hồi quy; cập nhật các test dựa trên baseline seed cũ theo ID/baseline mới. Bổ sung Playwright cho bộ lọc, eligibility, yêu cầu/thiếu/mua/nhận/lịch sử/chat và migration reload.
6. Chạy TypeScript, suite unit/component, production build, Playwright bị ảnh hưởng; sửa regression và ghi số liệu thật. Cập nhật data-model, requirements, README và kết quả triển khai tại cuối báo cáo.

## Tiêu chí hoàn thành

- Không có dữ liệu workbook thật trong source/seed/test/bundle hoặc báo cáo.
- Không đổi 3 bộ/năm, 40%, đơn vị bộ và quy tắc duyệt khi không có chứng cứ.
- Biến thể gender/size được xác nhận rõ hoặc hỏi lại; 2XL/XXL không tạo mã trùng; giá giao dịch không đổi theo giá danh mục.
- Ngân sách/khoa/tháng là metadata, không tạo rule tài chính; PR/PO link và report tính từ cùng state.
- Migration không mất hồ sơ demo đã lưu; trường chưa biết giữ trạng thái chưa cập nhật; dữ liệu lỗi có recovery/reset có xác nhận.
- Các kiểm tra chạy được phải qua; Playwright không khởi chạy được phải ghi blocked/notExecuted, không báo pass hoặc tạo screenshot giả.

## Trạng thái bàn giao

Các hạng mục triển khai ở bước 1–5 đã hoàn tất: schema/migration, services/selectors, seed, UI/report/assistant và test hồi quy. Bước 6 đã chạy TypeScript, build, 149 Vitest/RTL đều qua; discovery nhận 38 ca Playwright. Browser verification **bị chặn** khi preview không mở được cổng `127.0.0.1:4173` (`listen EPERM`): 38 ca chưa thực thi, 0 ảnh xác minh. Không đánh dấu tiêu chí browser là đạt. Đã cập nhật data-model, requirements, README; số liệu và câu hỏi nghiệp vụ còn mở ở phần 8–10 của [báo cáo đối chiếu](excel-alignment-report.md).
