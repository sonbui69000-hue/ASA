# Kết quả triển khai prompt 2

Nguồn: `AGENTS.md`, `prompts/prompt2.md`, `proposal.md` theo xác nhận của người dùng, và bốn tài liệu lập kế hoạch trước đó. Các tài liệu kế hoạch được giữ như hồ sơ của phase 1; nội dung dưới đây ghi lại hiện trạng và các quyết định bổ sung khi triển khai. Không đọc hoặc thực hiện prompt 3.

## Phạm vi đã triển khai

| Nhóm                 | Hiện trạng                                                                                                                                                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nền tảng             | React/TypeScript/Vite, Tailwind, các component theo mẫu shadcn với Radix Dialog/Slot và CVA, Lucide, Router, Recharts; chia bundle theo phân hệ; CSS token và giao diện tiếng Việt                                                                                                                                    |
| State và persistence | Một State có collection typed dùng ID liên kết; selector dùng chung, command transaction trên bản clone; Zod kiểm tra schema, invariant kho/tủ/nhận hàng; chỉ công bố state sau ghi localStorage thành công; chống lặp operation và revision cũ; phục hồi JSON hỏng không tự ghi đè                                   |
| Đồng phục            | CRUD mã bằng tạo/sửa/ngừng dùng; cỡ/chức danh, giá, hai kho và lô, cảnh báo thấp; điều chỉnh kiểm kê có lý do; yêu cầu nhiều dòng, nháp/sửa/gửi/duyệt/từ chối/giữ/bàn giao/hủy; định mức và ngoại lệ; hồ sơ từng người, lịch sử giá, nhận trả bộ còn sử dụng, báo cáo theo khoa/mã/cỡ/ngày và CSV                     |
| Tài liệu             | 8 tài liệu hư cấu có mục/nội dung, gồm bản nháp, thu hồi và hết hạn; full-text/token tìm tiếng Việt có/không dấu; quyền trước retrieval/getById; TXT/MD thật và mẫu DOCX mô phỏng; che tên/điện thoại/email tổng hợp; bắt buộc review trước xuất bản; phiên bản/ACL/hiệu lực, xác nhận đã đọc, tải văn bản, dẫn nguồn |
| Tủ                   | 60 tủ ban đầu; trạng thái suy ra từ tình trạng/giao nhận/giữ chỗ; CRUD bằng tạo/sửa/ngừng dùng; tòa/tầng/khu/khoa; preview xác định, một/nhiều tủ, người/đơn vị, giữ chỗ/nhận giữ chỗ, chuyển/trả/thu hồi, chống trùng và lịch sử                                                                                     |
| Mua                  | 32 mã NCC thuộc hai nhà cung cấp tổng hợp cho 16 SKU; tra tên/mã/loại/NCC, score 50/30/20 và lý do; human confirmation; PR nhiều dòng, thiếu liên kết, cap dự trữ, ba bước duyệt, adapter SAP riêng, lỗi giả, PO và nhận một phần tăng kho đúng một lần                                                               |
| Dùng chung           | Dashboard từ state/phạm vi quyền, tài khoản demo, tìm kiếm, thông báo/đánh dấu đã đọc, hộp duyệt, audit metadata trước/sau, cài đặt và reset có xác nhận                                                                                                                                                              |
| Trợ lý               | Nhận ý định xác định, hỗ trợ không dấu, tra stock theo kho, lịch sử/quota, tủ trống, mã NCC và trạng thái; tài liệu dẫn đoạn thật/phiên bản; kiểm lại theo state khi render; không tự phê duyệt/ghi kho/tạo PO; không có LLM ngoài                                                                                    |

Tài liệu đầu vào, workbook và skills không bị thay đổi để làm ứng dụng chạy. Không nhập danh tính, ghi chú cá nhân hoặc số liệu nghiệp vụ của workbook vào seed.

## Quyết định bổ sung so với kế hoạch

- Prompt 2 yêu cầu **ngoại lệ định mức**: mỗi yêu cầu có lý do ít nhất 10 ký tự; lý do làm xuất hiện thêm bước Lãnh đạo sau các bước thường. Không có nút bỏ qua định mức, không tự duyệt ngoại lệ qua AI. Ngoại lệ áp đúng hồ sơ, được lưu trong lịch sử.
- Prompt 2 yêu cầu **điều chỉnh kho**: chỉ Thủ kho thực hiện, số nguyên khác 0, có lý do; giảm không vượt tồn khả dụng, tăng tạo lô có giá. Nhận hàng PO vẫn là giao dịch riêng và không cộng kho thêm lần nữa.
- Giữ phân biệt **vật lý / giữ / khả dụng**: duyệt cuối giảm khả dụng bằng reservation; bàn giao mới giảm vật lý. Hủy trước bàn giao giải phóng giữ. Điều này bảo toàn yêu cầu đề xuất và cách diễn đạt “deduction only when issued” của prompt 2.
- Có **giữ chỗ tủ** ngoài giao trực tiếp. Giữ chỗ loại tủ khỏi khả dụng, có lịch sử, nhận giữ chỗ qua xác nhận chuyển/nhận tủ. Trạng thái bảo trì có thể giữ người dùng hiện tại để Hành chính xử lý; không tự biến thành trống.
- Dữ liệu thực tế gồm 120 nhân viên, 6 khoa, 21 tài khoản gắn vào các nhân viên đó, 16 SKU và 60 tủ. NV031/NV032/NV033 là ba hồ sơ trọng tâm của khoa Nội, thay cho số thứ tự minh họa trong kế hoạch.
- Các biểu mẫu tạo/sửa dùng dialog trên trang danh sách; một số đường dẫn dự kiến trong kế hoạch được gộp thành tab/dialog thay vì trang riêng.
- Collections được biểu diễn bằng mảng typed trong một state, tham chiếu bằng ID và selector; không có bản sao dữ liệu riêng trong mỗi module. Chưa cần tối ưu thành cơ sở dữ liệu hoặc normalized map ở quy mô demo.
- Giá FIFO, năm dương lịch, policy/workflow snapshot, cap floor và phân biệt mua bổ sung/dự trữ theo các giả định ở requirements. Một PR/PO dùng một NCC. Cấu hình không hồi tố lịch sử.
- PDF/DOCX tùy ý không được phân tích thật. UI có mẫu DOCX tổng hợp được đánh dấu rõ, và đọc TXT/MD UTF-8 tối đa 200 KB. File không hỗ trợ bị từ chối; không báo thành công trích xuất giả.
- Từ điển/heuristic AI là mô phỏng tìm gần nghĩa, không embeddings hay general intelligence. Chi tiết ngoài dữ liệu được trả thiếu dữ liệu; đối sánh chỉ gợi ý.

## Kiểm tra thực thi

Lần kiểm tra cuối ngày 10/11/2026: **58/58 test đạt trong 9 suite** (48 logic/service/lưu trữ, 10 component/hành trình React). TypeScript và production build đều đạt. Các suite liên quan cũng được chạy ở từng mốc. Không suy ra “pass” từ việc package đã cài hoặc từ test plan.

| Kiểm tra                  | Kết quả                                                                                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest logic/service      | **48 test đạt**: đồng phục, tài liệu, mua, tủ, lưu trữ, trợ lý và ca biên                                                                                                                                                   |
| React Testing Library     | Đã chạy 8 hành trình giao diện và 2 ca component: form, đổi vai trò duyệt/bàn giao, lỗi định mức, quyền tài liệu, che/review/publish, reserve cap, cấp nhiều tủ, assistant, notification/reset, tìm/sort/paging và validate |
| TypeScript                | **Đạt** — `npm run typecheck`                                                                                                                                                                                               |
| Production build          | **Đạt** — `npm run build`; chia bundle theo route, không còn cảnh báo chunk lớn của build đầu tiên                                                                                                                          |
| Dev server                | Thử `npm run dev`: môi trường từ chối `listen EPERM 127.0.0.1:5173`; không tuyên bố server đang chạy                                                                                                                        |
| Chromium                  | Thử cả Chromium và headless shell có sẵn với Playwright; tiến trình bị hệ điều hành chặn syscall socket (`Operation not permitted`); không có workflow/screenshot đạt                                                       |
| Browser runner            | Có runner chạy trên production build, không cần server; lần chạy thực tế bị chặn ở khởi tạo Chromium, kết quả ghi `output/playwright/browser-result.json`                                                                   |
| Responsive / kiểm tra mắt | Có CSS và kịch bản 375×812, 812×375, 768×1024, 1440×900; **chưa xác minh bằng browser/ảnh** do giới hạn trên                                                                                                                |
| Coverage phần trăm        | Chưa đo; không tuyên bố đạt mục tiêu coverage của kế hoạch. Không có coverage provider tương ứng trong cache, mạng registry bị giới hạn.                                                                                    |

Playwright skill đã được đọc và prerequisite npx có sẵn. CLI chưa có trong project/cache; cài registry bị giới hạn nên runner sử dụng thư viện Playwright đã cài trong dự án làm phương án dự phòng. Không tuyên bố đã thực hiện được quy trình CLI, chụp ảnh hay kiểm tra bố cục thật.

## Giới hạn còn lại

- Phải chạy lại browser runner và xem screenshot trên môi trường cho phép Chromium trước khi kết luận chất lượng bố cục, responsive và browser console. RTL/jsdom không thay thế kiểm tra đó.
- RBAC, audit và các tài khoản chỉ là chức năng mô phỏng. Dữ liệu localStorage đọc/sửa được từ DevTools; không có máy chủ bảo vệ, SSO, chữ ký số hay chống sửa nhật ký. Nhiều tab có thể bị yêu cầu tải lại; không có giao dịch nhiều thiết bị.
- Chưa hỗ trợ OCR/parser PDF/DOCX tùy ý, tìm vector, SAP thật, hủy PO đã đặt, trả nhà cung cấp, VAT/thanh toán, bàn giao một phần yêu cầu đồng phục hoặc cấp đồng phục hỏng trở lại kho. Không hiển thị nút giả cho các hành vi này.
- Loại đồng phục hiện gắn một-một với nhóm chức danh trong seed. Có thể đổi chức danh nhân viên nhưng chưa có trình biên tập bảng nhiều loại/chức danh. Quân số và giá trị trên dashboard đều là số tính được từ state.
- Số lượng demo nhỏ nên chưa tối ưu virtualized table hay index bên ngoài; sort/filter/pagination chạy cục bộ. Không khẳng định phù hợp dữ liệu bệnh viện thật.

Hướng dẫn khởi động, vai trò và luồng trình diễn ở [README.md](../README.md).
