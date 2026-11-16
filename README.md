# Vinmec — Bản mẫu hành chính tổng hợp

Cập nhật dữ liệu 11/11/2026: [đã nhập workbook vào store cục bộ](docs/workbook-import.md), giữ source records theo lựa chọn người dùng và **chặn OpenRouter cho workspace**. Xem tab **Dữ liệu Excel** trong Đồng phục, Mua sắm và Tủ đồ trên bản online 8080. Đây là nhật ký nguồn chỉ đọc; các giao dịch nghiệp vụ hiện có được giữ nguyên.

Hiện trạng mới nhất: [kiểm chứng AI Phase 6.5](docs/ai-verification.md) và [năm kịch bản stakeholder](docs/ai-demo-guide.md). Unit/API/build qua; browser, live inference và local semantic còn bị chặn, **chưa đủ điều kiện live AI demo đầy đủ**. Các báo cáo Phase 5 và 6.1–6.4 giữ làm lịch sử. Context theo nhánh hội thoại, hỏi rõ mã, nguồn mở đúng record; không có thao tác ghi tự động từ chat.

Ứng dụng React + TypeScript + Vite, giao diện tiếng Việt, đã triển khai phase 2–4, đối chiếu Excel ở phase 4.5 và chuẩn bị trình diễn theo `prompts/prompt5.md`, dựa trên `proposal.md` đã được người dùng xác nhận. Bắt đầu tại **Kịch bản trình diễn** (`/trinh-dien`) hoặc nút **Kịch bản 10 phút** trên Tổng quan. Kết quả hiện hành ở [docs/demo-verification.md](docs/demo-verification.md); báo cáo [phase 4.5](docs/excel-alignment-report.md) và [phase 4](docs/qa-report.md) được giữ để truy vết.

Seed và tests là dữ liệu tổng hợp cho **Bệnh viện Minh An demo**. Workspace online hiện có thêm source records từ workbook được người dùng cho phép lưu cục bộ; OpenRouter bị chặn cho workspace này. Chế độ offline không gọi LLM và vẫn có store riêng. Không dùng thông tin bệnh nhân hoặc tài khoản SAP thật. Phân quyền, phê duyệt và nhật ký là prototype; localStorage không cung cấp bảo mật sản xuất.

Tài liệu bàn giao: [kịch bản 10 phút](docs/demo-guide.md), [nhân viên/hàng/hợp đồng mẫu](docs/demo-data.md), [giới hạn và điều kiện sản xuất](docs/limitations.md). Mỗi kịch bản có vai trò bắt đầu, hướng dẫn và điều kiện kiểm tra trên state hiện hành. Mở kịch bản chỉ đổi vai trò/trang, không tự thực hiện hoặc bỏ qua nghiệp vụ.

## OpenRouter online — Phase 6.2

Đã bổ sung backend Node và công cụ chỉ đọc; xem [hướng dẫn triển khai/kiểm chứng](docs/ai-openrouter-implementation.md). Phase 6.3 bổ sung pipeline local embedding/hybrid và câu trả lời có nguồn; cần provision model để bật semantic. Các mô tả offline bên dưới vẫn áp dụng cho chế độ localStorage cũ.

```bash
npm run build
# Chỉ máy mới: npm run provision:accounts
npm run server
```

Mở `http://127.0.0.1:8080`, đăng nhập bằng mã demo riêng trong `.local/online/access-codes.json` (file chỉ người vận hành đọc). Lượt triển khai này đã provision, không in mã hoặc API key. Backend đọc đúng `OPENROUTER_API_KEY` và `OPENROUTER_MODEL` từ `.env`; sửa model rồi restart server, không có model hardcode. Chưa chạy live inference trong QA; test OpenRouter bằng mock.

Online: bốn module, UI và tools cùng dùng state chuẩn trong `.local/online/state.json`; localStorage chỉ cache đã lọc, không gửi snapshot/role cho AI. Offline vẫn dùng localStorage tại origin cũ, không bị reset/merge tự động. Muốn chuyển giao dịch cũ: Quản trị xuất JSON ở Thiết lập, xác nhận synthetic, dừng server rồi dùng `npm run import:online -- <file.json> --confirm-synthetic`. Bản đọc online không phải backup chuẩn. Chi tiết trong tài liệu triển khai.

Dev online dùng terminal khác chạy `npm run dev:online` (5174, proxy về server 8080). `npm run test:e2e:online` chạy sáu ca browser với fake provider và workspace tạm; `npm run test:qa` bao gồm cả hai suite. Hiện môi trường chặn mở cổng localhost nên E2E vẫn chưa xác minh. RBAC/session demo và file JSON không phải bảo mật sản xuất.

## Chạy tại máy phát triển

Môi trường đã kiểm tra toolchain: Node 26.9.0, npm 12.2.0. Khi clone/sao chép dự án sang máy khác:

```bash
npm ci
npm run dev
```

Mở `http://127.0.0.1:5173`. Dữ liệu được lưu trong trình duyệt tại khóa `vinmec-admin-demo:state:v1`, nội dung schema v2. Dữ liệu schema v1 được chuyển tự động, giữ IDs/hồ sơ/giá lịch sử; giới tính thiếu và metadata ngân sách không được đoán. Không tự thêm giao dịch seed mới vào dữ liệu đã lưu. Có thể dùng Thiết lập demo → Khôi phục dữ liệu demo để nạp seed mới; khôi phục cần xác nhận và không sửa tài liệu nguồn.

Trước buổi demo phase 5: mở `/trinh-dien`, chuyển Quản trị và **Nạp lại bộ trình diễn** có xác nhận. Việc này nạp 60 tủ trên hai tòa, giữ 37 tủ trống và để DP-KT-L chưa có mapping nhằm trình diễn xác nhận mã đúng. Dữ liệu đã lưu từ phase trước chỉ đổi khi người dùng chủ ý reset. Chạy lần lượt năm kịch bản sau một lần nạp, không reset giữa chúng.

```bash
npm run test
npm run typecheck
npm run build
npm run preview
```

Build tạo `dist/`, có chia bundle theo phân hệ. Ứng dụng hoạt động cục bộ, không cần backend/database hoặc API nghiệp vụ bên ngoài. Cài package và browser ở máy mới cần truy cập registry tương ứng; các dependency được cài trong dự án, không cài global.

## Phân hệ và tài khoản trình diễn

- **Tổng quan:** KPI, biểu đồ, yêu cầu gần đây, hoạt động và liên kết đến dữ liệu thực tế trong state.
- **Đồng phục:** danh mục/giới tính/cỡ/giá, hai kho, lô và biến động, điều chỉnh kiểm kê có lý do, danh bạ/ngày cấp gần nhất, định mức, ngoại lệ có duyệt, yêu cầu nhiều dòng, giữ/bàn giao/hủy/nhận trả, liên kết PR/PO, báo cáo và CSV. Cỡ 2XL được chuẩn hóa thành XXL, XXXL thành 3XL.
- **Tài liệu:** tìm theo tên/nội dung/danh mục, quyền đọc và xác nhận, phiên bản/ngày hết hạn, nhập TXT/MD, bộ mẫu DOCX giả lập, che thông tin tổng hợp, rà soát/xuất bản/thu hồi, trích đoạn và tải văn bản.
- **Tủ đồ:** danh mục theo tòa/tầng/khu/khoa, tình trạng, trống/đang dùng/giữ chỗ/bảo trì, phân bổ đơn hoặc nhiều tủ, giao người/đơn vị, chuyển, nhận giữ chỗ, trả/thu hồi và lịch sử.
- **Mua sắm:** nhu cầu thiếu liên kết đồng phục, PR nhiều dòng, 40% dự trữ, danh mục SAP giả, xếp hạng mã có lý do, xác nhận sai khác, duyệt nhiều bên, PO mô phỏng và nhận từng phần tăng kho. PR/PO có metadata ngân sách/khoa/tháng dự kiến; tab Tổng hợp mua lọc và xuất CSV bằng giá giao dịch.
- **Dùng chung:** tìm kiếm, thông báo/đánh dấu đã đọc, hộp duyệt, nhật ký trước/sau, thiết lập, lưu trữ và trợ lý xác định có nguồn. Trợ lý có bảng chat mở rộng, câu hỏi gợi ý/nối tiếp, lịch sử theo tài khoản trong phiên, trích đoạn tài liệu đúng phiên bản/mục và số liệu tự cập nhật từ state. Trợ lý mở biểu mẫu nghiệp vụ để người có quyền kiểm tra/xác nhận, không tự ghi nghiệp vụ.

Chọn tài khoản tại thanh trên cùng. Để đổi vai trò khi đang xem hồ sơ trong dialog, đóng dialog trước rồi đổi tài khoản, mở lại hồ sơ.

| Tài khoản hiển thị                       | Cách sử dụng                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| Điều phối khoa Nội                       | Tạo và gửi yêu cầu cho khoa Nội                                                         |
| Trưởng khoa Nội                          | Duyệt bước khoa                                                                         |
| Hành chính tổng hợp                      | Duyệt bước Hành chính, quản lý tủ                                                       |
| Hành chính • người duyệt bổ sung         | Duyệt độc lập khi người gửi là tài khoản Hành chính khác                                |
| Thủ kho trung tâm                        | Điều chỉnh kiểm kê, bàn giao đồng phục, xác nhận nhận hàng và nhận trả                  |
| Chuyên viên mua sắm                      | Đối sánh mã, chỉnh/gửi PR, tạo PO sau đủ duyệt                                          |
| Kiểm soát tài chính / Lãnh đạo phê duyệt | Duyệt đề nghị mua; Lãnh đạo xử lý thêm ngoại lệ định mức                                |
| Quản lý tài liệu                         | Nhập/biên tập, rà soát, quyền, phiên bản và xuất bản/thu hồi                            |
| Nhân viên khoa Nội                       | Xem dữ liệu cá nhân, đọc/ký tài liệu được phép                                          |
| Quản trị bản mẫu                         | Đổi định mức, tỷ lệ dự trữ, luồng duyệt, ngày demo, kịch bản SAP và thông tin nhân viên |

Có điều phối/trưởng khoa bổ sung cho các khoa khác. Mọi tài khoản tham chiếu cùng 120 nhân viên, không làm tăng quân số chỉ vì thêm vai trò.

## Kịch bản ngắn

1. Điều phối Nội tạo yêu cầu cho **Nhân viên demo 031**, chọn `DP-DD-M`, 1 bộ. Người này đã nhận 2 bộ trong năm 2026. Gửi, đổi Trưởng khoa để duyệt, đổi Hành chính duyệt cuối, đổi Thủ kho bàn giao. Thử xin 2 bộ để xem chặn định mức, hoặc nhập lý do ngoại lệ để thêm bước Lãnh đạo.
2. `DEMO-YC-001` đã giữ 2 bộ cho NV032; có thể bàn giao hoặc Hành chính hủy có lý do. Ban đầu `DP-DD-M` tại kho trung tâm có 10 vật lý / 2 giữ / 8 khả dụng. Giá cấp lịch sử của NV031 là 260.000 đồng, khác giá hiện tại 300.000 đồng.
3. `DEMO-YC-002` thiếu 2 bộ bác sĩ XL cho NV033. Mua sắm → Nhu cầu bổ sung → tạo PR → Mua sắm gửi → Hành chính/Tài chính/Lãnh đạo duyệt → Mua sắm tạo PO → Thủ kho nhận → Điều phối gửi lại yêu cầu và hoàn thành cấp phát.
4. Quản lý tài liệu mở `DEMO-TL-006` → che thông tin → rà soát → xuất bản. Nhân viên đọc và xác nhận. Hợp đồng An Tâm chỉ hiển thị với các vai trò được cấp quyền; tài liệu hết hạn/thu hồi không đi vào retrieval.
5. Hành chính → Tủ đồ → Phân bổ tủ → chọn số lượng, vị trí, người hoặc đơn vị → gợi ý → xác nhận; sau đó chuyển hoặc trả/thu hồi.
6. Hỏi trợ lý: “Định mức đồng phục mỗi năm?”, “Tồn kho DP-DD-M ở kho Nội”, “Nhân viên demo 031 đã nhận mấy bộ?”, “Tìm tủ trống khu B”, “Mã NCC DP-DD-M”, “DEMO-YC-002 đang chờ ai?”.
7. Seed mới có NV004 đã cấp đủ 3 bộ; hàng nữ XS đủ tồn, nữ XXL thiếu, nam cỡ 40 và dùng chung 3XL; một PR chờ duyệt và một PO nhận đủ. Thử “Tồn kho điều dưỡng nữ 2XL”, “Tổng hợp mua tháng 10/2026 ngân sách DEMO-NS-HC-26”. Mọi mã/giá đều hư cấu. Đơn vị vẫn bộ; chưa quy đổi cái/đôi.

## Kiểm thử trình duyệt

```bash
npx playwright install chromium
npm run build
npm run test:e2e
# Chỉ hành trình trợ lý
npm run test:e2e:assistant
# Năm kịch bản trình diễn, trên desktop và mobile
npm run test:e2e:demo
# Chỉ hành trình thay đổi phase 4.5
npm run test:e2e -- excel-alignment.spec.ts uniform-purchasing.spec.ts
# Chạy toàn bộ kiểm tra và ghi báo cáo JSON
npm run test:qa
```

Bộ Playwright Test cố định nằm trong `tests/e2e/`, cấu hình tại `playwright.config.ts`. Có 24 kịch bản chạy trên 2 cấu hình desktop/mobile, tổng 48 ca, gồm năm kịch bản 10 phút, biến thể nữ XXL từ thiếu hàng đến mua/nhận/cấp/chat và migration v1→v2 qua reload. Framework tự mở production preview thật tại `http://127.0.0.1:4173` và kiểm tra bằng trình duyệt; không thay request bằng nội dung giả lập. Không cần mở preview thủ công trước khi chạy suite. Các ca bao phủ nghiệp vụ, quyền, trợ lý, điều hướng, lưu trữ, reset, console/network và tràn ngang. Ảnh bao gồm Tổng quan, Đồng phục, Tài liệu, Tủ đồ, Mua sắm, trợ lý, tiến trình duyệt và trang kịch bản; chỉ chụp khi thực sự chạy được. Báo cáo JSON/HTML, trace lỗi và ảnh nằm dưới `output/playwright/`.

`npm run test:qa` chạy TypeScript, production build, Vitest và Playwright, ghi tổng hợp vào `output/qa/summary.json`. Lệnh trả exit 1 nếu E2E bị chặn hoặc bất kỳ bước nào lỗi; tách rõ passed/failed/skipped/notExecuted. `npm run test:e2e:list` chỉ liệt kê, không xác minh hành vi. Runner route cục bộ của phase trước được giữ tại `scripts/browser-check.mjs` qua `npm run test:e2e:legacy`; không dùng nó thay bộ kiểm tra ứng dụng đang chạy thật.

Có thể chỉ định browser đã cài bằng biến `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. Đây là tùy chọn đường dẫn, không tải hoặc cài browser toàn cục.

Trong sandbox này, cả dev server và production preview bị chặn `listen EPERM`. Suite Playwright không thể khởi động web server nên **chưa có hành trình browser hoặc screenshot được xác minh**, dù Vitest/RTL và build chạy được. Cần chạy lại `npm run test:qa` ở môi trường cho phép mở cổng cục bộ và chạy Chromium trước khi chốt sẵn sàng trình diễn. Chi tiết phase 2 ở [docs/implementation.md](docs/implementation.md); thiết kế trợ lý ở [docs/assistant.md](docs/assistant.md); QA hiện hành ở [docs/demo-verification.md](docs/demo-verification.md).
