# Hướng dẫn trình diễn 10 phút — phase 5

Đối tượng: các bên liên quan hành chính bệnh viện Vinmec. Đây là bản mẫu hư cấu, không phải hệ thống bệnh viện đang vận hành. Tên viện dữ liệu là **Bệnh viện Minh An demo**. Không dùng thông tin từ workbook thật khi trình diễn.

## Chuẩn bị trước buổi trình diễn

1. Ở máy cho phép mở cổng HTTP cục bộ và chạy Chromium: `npm ci` nếu chưa có dependency, `npm run build`, sau đó `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Mở `http://127.0.0.1:4173/trinh-dien`. Dùng trình duyệt/tab riêng cho buổi demo, tránh tab khác cùng sửa localStorage.
2. Trên **Kịch bản trình diễn**, chọn **Chọn Quản trị để nạp lại** nếu cần. Chọn **Nạp lại bộ trình diễn** và xác nhận. Thao tác này xóa thay đổi demo đã lưu; tải JSON hiện có ở Thiết lập nếu cần giữ trước khi xác nhận. Không có reset âm thầm khi mở trang hoặc kịch bản.
3. Kiểm tra cả 5 nút **Mở kịch bản** đều bật. Bộ mới có ngày 10/11/2026, 120 nhân viên/6 khoa, định mức 3 bộ/năm, trần dự trữ 48 bộ (40%), 37 tủ trống, một PO nhận đủ và một PR chờ duyệt. DP-KT-L chưa được xác nhận mã NCC.
4. Đặt desktop khoảng 1440×1000, zoom 100%. Thanh tài khoản luôn ở trên; đóng hộp hồ sơ trước đổi vai trò. Mỗi kịch bản tự chọn vai trò bắt đầu; các bước duyệt tiếp theo dùng thanh **Tài khoản demo**.
5. Với tài khoản Mua sắm, mở trợ lý, chọn **Xóa hội thoại** nếu có các câu hỏi từ buổi trước, rồi đóng. Reset dữ liệu nghiệp vụ không xóa hội thoại theo phiên. Làm nóng các phân hệ trước giờ bắt đầu nếu máy chậm.
6. Chạy `npm run test:qa` trước buổi diễn. Kết quả browser cuối ở [demo-verification.md](demo-verification.md). Trong môi trường soạn thảo hiện tại, server bị `listen EPERM`, nên chưa xác minh được Playwright/screenshot. Không coi build hoặc RTL là bằng chứng browser đã qua.

Không reset giữa 5 kịch bản: chúng sử dụng người/mã và hồ sơ độc lập. Nếu đã làm một phần hoặc sửa dữ liệu, trang kịch bản kiểm tra điều kiện hiện tại và có thể yêu cầu nạp lại. Đây là kiểm tra hỗ trợ người trình bày, không thay validation nghiệp vụ.

## Kịch bản theo thời gian

| Mốc         | Nội dung                          | Điểm cần truyền đạt                                                         |
| ----------- | --------------------------------- | --------------------------------------------------------------------------- |
| 00:00–00:45 | Tổng quan và nhãn mô phỏng        | Một dữ liệu chung xuyên bốn phân hệ; không SAP/LLM thật                     |
| 00:45–03:15 | 1. Yêu cầu đồng phục cho nhóm     | Kiểm tra định mức, duyệt độc lập, bàn giao và giữ giá lịch sử               |
| 03:15–04:45 | 2. Thiếu hàng → PR                | Không nhập lại nhu cầu, PR nháp chưa tăng kho                               |
| 04:45–06:15 | 3. Hỏi hợp đồng và mở nguồn       | Trả lời có căn cứ, đúng đoạn và quyền đọc                                   |
| 06:15–07:45 | 4. Phân bổ ba tủ                  | Xem trước không ghi; xác nhận cập nhật cùng KPI/lịch sử                     |
| 07:45–09:15 | 5. Xác nhận mã NCC                | Mã gần giống cần người kiểm tra; điểm không phải xác suất                   |
| 09:15–10:00 | Tổng kết bằng dữ liệu và giới hạn | localStorage giữ thay đổi, RBAC mô phỏng; các yêu cầu sản xuất cần khảo sát |

### 00:00 — Mở đầu

Mở **Tổng quan**, chỉ KPI và nhãn “Bản mô phỏng”. Nói: “Đây là bản mẫu hành chính dùng dữ liệu hư cấu. Mục tiêu hôm nay là theo dõi một nhu cầu qua người xử lý và xem lại căn cứ trên cùng dữ liệu.” Sau đó mở **Kịch bản trình diễn**. Mỗi thẻ có điểm bắt đầu, các bước và kết quả; nút mở chỉ đổi vai trò/trang, không tự thực hiện giao dịch.

### 1. Yêu cầu đồng phục cho ba người

Chọn **Mở kịch bản 1** → tài khoản **Điều phối khoa Nội**. Chọn **Lập yêu cầu** và thêm đủ 3 dòng:

| Người nhận         | Chức danh     | Mã hàng | Số bộ | Hạn mức đầu buổi |
| ------------------ | ------------- | ------- | ----: | ---------------- |
| Nhân viên demo 031 | Điều dưỡng    | DP-DD-M |     1 | Đã cấp 2, còn 1  |
| Nhân viên demo 035 | Điều dưỡng    | DP-DD-M |     1 | Đã cấp 0, còn 3  |
| Nhân viên demo 036 | Kỹ thuật viên | DP-KT-M |     1 | Đã cấp 0, còn 3  |

1. **Lưu bản nháp**. Ghi nhận mã yêu cầu mới trên danh sách, chọn **Xem hồ sơ** ở đúng dòng → **Gửi duyệt yêu cầu** → **Xác nhận**. Nháp/gửi chưa làm giảm tồn vật lý.
2. Đóng hồ sơ. Chọn **Trưởng khoa Nội**, mở lại đúng mã vừa tạo (có thể dùng tìm kiếm toàn ứng dụng), **Duyệt yêu cầu** → **Xác nhận**. Đóng hồ sơ, chọn **Hành chính tổng hợp**, mở lại và duyệt bước hai. Chỉ bước này giữ hàng.
3. Đóng hồ sơ. Chọn **Thủ kho trung tâm**, mở lại và **Xác nhận bàn giao** → **Xác nhận**. Trạng thái thành **Đã cấp phát**.
4. Đóng hồ sơ, tab **Nhân viên**, tìm `DEMO-NV-031`, chọn **Lịch sử cấp**. Người này nay đã nhận 3 bộ; giá cấp cũ 260.000 đồng vẫn giữ. Kho trung tâm DP-DD-M còn **8 vật lý / 2 giữ / 6 khả dụng**; DP-KT-M giảm 1.

Câu chốt: “Duyệt, giữ hàng và bàn giao là ba sự kiện khác nhau; một người không tự hoàn tất mọi bước. Quota tính cả số đã cấp và đang cam kết.” Có thể nêu NV004 đã nhận đủ 3 bộ, không cần cố gửi thêm hồ sơ trong thời lượng chính.

### 2. Phát hiện thiếu và chuẩn bị PR

Đóng dialog, về trang kịch bản, **Mở kịch bản 2** → **Chuyên viên mua sắm**, tab **Nhu cầu bổ sung**.

1. Tìm dòng `DEMO-YC-002`, thiếu 2 bộ `DP-BS-XL` cho NV033. Chọn **Tạo bản nháp mua**.
2. Kiểm tra số lượng 2, mục đích bổ sung, yêu cầu nguồn và mã `SAP-A-1003`. Nhập **Mã ngân sách demo** `DEMO-NS-LIVE`; khoa hạch toán **Khoa Nội**, tháng dự kiến `2026-11`.
3. **Lưu đề nghị nháp**, mở PR mới và chỉ rõ các bước Hành chính → Tài chính → Lãnh đạo khi gửi. Thành tiền tự tính **840.000 đồng**; tồn DP-BS-XL vẫn **0**. PR không phải PO, PO cũng chưa phải nhận kho.

Kết quả chính của kịch bản là **PR nháp có nguồn đúng**, không phải hoàn tất mua trong 90 giây. Nếu có thêm thời gian, gửi PR, đổi ba người duyệt, Mua sắm tạo PO mô phỏng, Thủ kho nhận; sau đó quay lại gửi/duyệt/cấp yêu cầu đồng phục. Luồng mở rộng đã có test riêng, không tự bỏ bước duyệt. Seed đã có một PO nhận đủ để mở minh họa ngay.

### 3. AI tra cứu hợp đồng và mở đúng đoạn

**Mở kịch bản 3** → Mua sắm. Mở **Trợ lý demo**, nhập nguyên câu:

> Thời hạn giao hàng trong hợp đồng An Tâm là gì?

1. Đọc câu trả lời **10 ngày làm việc** và nhãn AI mô phỏng.
2. Chọn dẫn nguồn **Hợp đồng cung cấp đồng phục An Tâm • v1 • 2**. URL phải tới `/tai-lieu/DEMO-TL-004?version=1#muc-2`.
3. Chỉ mục **2. Hàng hóa và giao nhận**, có cùng nội dung làm căn cứ. Đây là hợp đồng hư cấu, không phải tài liệu Vinmec hoặc chứng cứ hiệu lực pháp lý.

Câu chốt: “Trợ lý truy xuất nội dung đã được phép đọc. Chọn tài khoản không có quyền sẽ không đọc được hợp đồng; không gọi LLM ngoài và không tự duyệt hồ sơ.”

### 4. Phân bổ tủ cho một nhóm

Đóng tài liệu, **Mở kịch bản 4** → **Hành chính tổng hợp**.

1. Chọn **Phân bổ tủ**, số lượng **3**, nhận theo nhân viên. Chọn `DEMO-NV-001`, `DEMO-NV-002`, `DEMO-NV-003`. Desktop dùng Ctrl/Cmd để chọn nhiều; mobile dùng điều khiển chọn nhiều của thiết bị. Giữ “Tất cả” ở bộ lọc vị trí và không chọn giữ chỗ.
2. Nhập lý do `Phân bổ nhóm trình diễn`, chọn **Gợi ý danh sách tủ**. Có đúng 3 tủ xem trước; lúc này chưa ghi giao nhận.
3. **Xác nhận phân bổ**. Mỗi người có một tủ khác nhau, lịch sử có thêm 3 sự kiện. Mở **Tổng quan** để thấy **34 tủ trống** (từ 37 đầu buổi).

Câu chốt: “Vị trí có nhiều tòa/tầng; tủ hỏng và tủ đã dùng được loại khỏi gợi ý. Xác nhận mới ghi toàn bộ nhóm, tránh cấp trùng.”

### 5. Mã SAP chưa chắc chắn — người mua kiểm tra

**Mở kịch bản 5** → Mua sắm, tab **Mã nhà cung cấp**.

1. Chọn **Mã nội bộ cần đối sánh** `DP-KT-L`. Gõ `bộ kỹ thuật` vào **Tra theo mã SAP / tên sản phẩm**.
2. So sánh `SAP-A-1010` (100%, Cotton 65%) với `SAP-B-2010` (80%, Polyester 80%, “Khác chất liệu”). Cả hai là dữ liệu nhà cung cấp giả; điểm là công thức 50/30/20, không phải xác suất AI.
3. Với yêu cầu Cotton 65%, chọn **Xác nhận đối sánh** trên đúng dòng `SAP-A-1010`. Nhập lý do `Đã đối chiếu loại, cỡ L và Cotton 65% trong catalog demo`, rồi **Xác nhận**.
4. Dòng hiện **Đã đối chiếu**. Tải lại, chọn lại `DP-KT-L`/`SAP-A-1010` để thấy mapping vẫn lưu. Nhật ký có `mapping.confirm`, xác nhận bởi Mua sắm.

### 09:15 — Kết thúc

Mở **Nhật ký thao tác** để xem bàn giao, tạo PR, phân bổ tủ, xác nhận mã; nhắc rằng tất cả cùng localStorage. Nêu rõ giới hạn: dữ liệu trên một trình duyệt, vai trò/duyệt/audit mô phỏng, không tích hợp thật. Bước tiếp theo là xác nhận nghiệp vụ, quyền và tích hợp trong [limitations.md](limitations.md), không tuyên bố sẵn sàng sản xuất.

## Khi thao tác khác dự kiến

- Có nhiều hồ sơ: dùng đúng mã vừa tạo và bộ lọc tìm kiếm; không nhấn thao tác hàng loạt theo vị trí dòng.
- Nút mở bị khóa: dữ liệu không còn đúng điều kiện. Chỉ reset khi chấp nhận mất thay đổi; chạy lại từ đầu, không sửa state trong DevTools để tiếp tục.
- Không thấy nút duyệt: đóng hồ sơ, chọn đúng tài khoản và mở lại; kiểm tra bước tới lượt, người gửi không tự duyệt.
- Dữ liệu lỗi/phiên bản lạ: tải JSON từ màn khôi phục, sau đó reset có xác nhận. Không xóa localStorage âm thầm.
- Server không khởi động hoặc Chromium bị chặn: báo hạn chế môi trường và dùng tài liệu để giải thích luồng; không nói đã chạy live hoặc dùng ảnh dựng để thay bằng chứng thực thi.
