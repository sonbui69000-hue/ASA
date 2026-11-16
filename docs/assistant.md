# Trợ lý dùng chung — prompt 3

Thực hiện trên dự án hiện có, theo AGENTS.md, proposal.md đã được xác nhận và tài liệu kế hoạch phase 1. Chỉ triển khai prompt 3; không đọc hoặc thực hiện prompt tiếp theo. Không thay seed bằng dữ liệu trong workbook. Không thêm dependency, API LLM, inference hay kết nối SAP thật.

## Hoạt động

Nút trợ lý nằm trong shell dùng chung. Bảng chat có mở rộng/thu gọn, đóng, gợi ý, gửi bằng Enter, trạng thái đang đối chiếu, yêu cầu bổ sung/chọn mã, không có kết quả, lỗi có thử lại và câu hỏi ngoài phạm vi. Dùng Radix Dialog để quản lý focus, Escape và trả focus; log thông báo cập nhật có nhãn tiếng Việt. UI/UX Pro Max được dùng để đối chiếu phản hồi loading, focus, tương phản và bố cục thích ứng.

Giữ 30 lượt gần nhất theo tài khoản trong `sessionStorage` (`asa-demo-chat:v1:<accountId>`); đóng/mở, đổi trang và tải lại trong cùng tab giữ lịch sử. Chỉ lưu câu hỏi và mã hồ sơ từ ngữ cảnh trang, không lưu câu trả lời/đoạn tài liệu. Đổi tài khoản hiển thị lịch sử riêng và truy xuất lại với quyền mới. Khi storage phiên không dùng được, hội thoại trong bộ nhớ vẫn hoạt động. Dữ liệu nghiệp vụ tiếp tục dùng cùng DemoStore và localStorage của phase 2.

## Pipeline xác định

1. `src/domain/assistant-routing.ts`: chuẩn hóa Unicode và tiếng Việt không dấu; tách mã nhân viên/hồ sơ/SKU/SAP, chức danh, cỡ, khoa, kho, tòa/tầng/khu, năm, số bộ và thuộc tính giới tính được hỏi. “Blouse” ánh xạ sang loại bác sĩ; danh mục chưa có thuộc tính nam/nữ nên phải thông báo giới hạn khi đối sánh.
2. Định tuyến vào 13 ý định đề xuất trong prompt, cùng `ACTION_REVIEW` và `UNSUPPORTED`. Trạng thái trả lời độc lập với ý định, ví dụ tồn kho thiếu cỡ vẫn có intent `UNIFORM_INVENTORY` và status `missing`/`ambiguous`.
3. `src/domain/assistant.ts`: xác minh lại tài khoản hiện hành, gọi các selector chung về quyền, kho, lịch sử/cam kết, tủ, ứng viên nhà cung cấp, yêu cầu và đề nghị mua. Tên nhân viên được resolve trong tập được phép; không tự thay tên không tìm thấy bằng người đăng nhập. Tên trùng yêu cầu chọn mã.
4. `src/domain/assistant-documents.ts`: lấy tài liệu đã xuất bản/còn hiệu lực/đúng ACL trước khi xếp hạng. Tìm trên cả tiêu đề và nội dung từng mục, xử lý từ dừng/cụm từ và sắp xếp hòa điểm ổn định. Trích nguyên văn tối đa 3 mục phù hợp; evidence gồm mã, tên, phiên bản, tiêu đề mục, đoạn thật và URL có version/hash. “Tái cấp” chưa có đoạn tương ứng trong seed nên báo chưa đủ bằng chứng.
5. Template chỉ sử dụng dữ liệu dịch vụ trả về. Câu nối tiếp ngắn như “Còn size L thì sao?” hoặc “Còn tầng 2 thì sao?” giữ chủ đề trước và thay tham số. “Yêu cầu này” dùng mã hồ sơ của trang tại thời điểm gửi hoặc mã ở lượt trước; thiếu mã thì hỏi lại.
6. Chat dựng lại đáp án khi revision/quyền thay đổi. Thu hồi/hết hạn/đổi ACL không tiếp tục hiển thị đoạn cũ; tồn, tủ và bước duyệt đọc lại từ cùng state nghiệp vụ. Không cache snippet riêng.

Phân quyền ở đây là mô phỏng phía trình duyệt, không phải bảo mật sản xuất.

## Thay đổi dữ liệu và đối sánh

Theo kiến trúc đã lập, chat chỉ truy vấn hoặc mở route/biểu mẫu. “Duyệt giúp”, “tạo PO”, “cấp tủ giúp” trả rõ chưa thay đổi dữ liệu và đường đến màn hình kiểm tra. Người có quyền phải xác nhận tại biểu mẫu dùng cùng `DemoStore.dispatch`/`execute`, validation và nhật ký như thao tác thông thường; trợ lý không tạo quyết định duyệt hoặc PO.

Đối sánh trả các ứng viên đúng loại/cỡ với mã SAP mô phỏng thật trong catalog, điểm quy tắc, lý do khác chất liệu và trạng thái mapping đã xác nhận. Điểm không phải xác suất. Liên kết mở trang nhà cung cấp; tài khoản Mua sắm xác nhận mã và lý do ở biểu mẫu hiện có. Câu hỏi không tự thay mapping hoặc báo thành công giả.

## Câu hỏi để trình diễn

| Câu hỏi                                              | Kết quả từ seed                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- |
| Kho còn bao nhiêu áo blouse size M?                  | SKU bác sĩ M; vật lý/giữ/khả dụng từ ledger                                   |
| Tồn kho DP-DD-M                                      | 10 vật lý, 2 giữ, 8 khả dụng ở kho trung tâm                                  |
| Tồn kho DP-DD-M ở kho Nội                            | 0 vật lý, 0 giữ, 0 khả dụng                                                   |
| Nhân viên demo 031 đã được cấp bao nhiêu bộ năm nay? | 2 bộ năm 2026, nguồn nhân viên và dòng cấp                                    |
| Nhân viên Nguyễn Văn A đã được cấp bao nhiêu bộ?     | Không tìm thấy trong phạm vi, không tạo nhân viên giả                         |
| Có bao nhiêu tủ trống ở tầng 3?                      | 20 tủ; sau giao DEMO-TU-041 còn 19                                            |
| Còn tầng 2 thì sao?                                  | Giữ chủ đề tủ, 17 tủ trống                                                    |
| Tìm mã SAP tương ứng với áo điều dưỡng nữ size L.    | SAP-A-1006 / SAP-B-2006; yêu cầu kiểm tra thông số, chưa có thuộc tính nam/nữ |
| Đơn mua hàng nào đang chờ phê duyệt?                 | Seed chưa có PR; sau tạo/gửi PR, trả đúng mã và bước đang chờ trong phạm vi   |
| Tìm hợp đồng với nhà cung cấp đồng phục.             | Chỉ người được quyền đọc thấy DEMO-TL-004, trích đoạn thật                    |
| Định mức đồng phục mỗi năm?                          | DEMO-TL-002 v2, mục 2 và cấu hình hiện hành                                   |
| Quy định tái cấp đồng phục là gì?                    | Chưa đủ đoạn tài liệu phù hợp                                                 |

## Kiểm tra

`src/domain/assistant.test.ts` gồm bảng **49 câu hỏi tiếng Việt**, kiểm ý định, tham số, số cụ thể, mã hồ sơ và citation, cùng các case tích hợp biến động kho/cấp phát, phân bổ tủ, phê duyệt/từ chối, PR/PO/nhận một phần, phiên bản/thu hồi/ACL, tên trùng, nội dung tài liệu chứa câu ra lệnh và tính xác định/không ghi state khi hỏi. Tổng cộng 60 case logic trợ lý.

`src/test/assistant.test.tsx` kiểm giao diện thực bằng React Testing Library: loading, focus, mở rộng, câu nối tiếp, lịch sử qua điều hướng/remount, nguồn/thu hồi, đổi tài khoản, lỗi/thử lại. Hành trình chat mở yêu cầu → bấm duyệt → xác nhận kiểm rằng state chỉ đổi sau xác nhận, nhật ký được ghi và chat đọc bước duyệt mới. Các workflow phase 2 tiếp tục được chạy trong toàn bộ bộ test.

Playwright có hành trình trợ lý đầy đủ trong `scripts/browser-check.mjs`, chạy riêng bằng `npm run test:e2e:assistant` sau `npm run build`. Dùng thư viện Playwright đã cài làm fallback vì CLI không có trong cache (`ENOTCACHED`), mạng cài package bị hạn chế. Trình duyệt thật vẫn bị sandbox chặn `setsockopt: Operation not permitted` khi khởi động Chromium, trước bất kỳ tương tác nào. **Chưa xác minh được hành trình browser hoặc ảnh responsive.** Không coi RTL là thay thế cho yêu cầu browser này. Log ở `output/playwright/assistant-browser-attempt.log`, báo cáo ở `output/playwright/assistant-browser-result.json`; báo cáo `blocked` có danh sách kết quả rỗng.

Kết quả thực thi cuối ngày 10/11/2026:

| Lệnh                                                                                   | Kết quả thực tế                                                                                                     |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm run test -- --reporter=dot`                                                       | **113/113 qua**, 10 suite; gồm 60 case logic trợ lý, 7 case RTL trợ lý và các kiểm thử nghiệp vụ/thành phần còn lại |
| `npm run build`                                                                        | Qua TypeScript `tsc --noEmit` và Vite production build                                                              |
| `prettier --check src scripts vite.config.ts package.json README.md docs/assistant.md` | Qua                                                                                                                 |
| `node --check scripts/browser-check.mjs`                                               | Qua kiểm tra cú pháp runner                                                                                         |
| `npm run test:e2e:assistant` với Chromium đã cài                                       | **Bị chặn**, exit 1 tại browser launch, 0 hành trình được thực thi                                                  |

Giới hạn còn lại là chạy và xác minh hành trình Playwright trên Chromium trong môi trường cho phép khởi chạy browser. Không báo hoàn tất yêu cầu kiểm chứng trình duyệt khi điều kiện này chưa được đáp ứng.

## Cập nhật Phase 6.3

Online bổ sung `server/rag` và OpenRouter generation từ evidence có span/hash/version/ACL, UI hiển thị generation/retrieval modes và nguồn có ID/mục. Offline vẫn là trợ lý xác định từ khóa như mô tả lịch sử. Local neural model chưa khả dụng trên máy triển khai này, nên không tuyên bố hybrid đã chạy. Xem [triển khai](ai-rag-implementation.md) và [đánh giá](ai-rag-evaluation.md).

## Cập nhật Phase 6.4

Phase 6.4 bổ sung thanh context, lựa chọn làm rõ, composer nhiều dòng, cancel/retry tại chỗ, new-topic/clear có context server và source readers theo stable IDs. Context gắn session/workspace/parent; tool intent thực thay cho fallback intent, không cache số liệu. Xem [báo cáo và kiểm chứng](ai-ux-verification.md). Browser vẫn bị EPERM, không có screenshot xác minh; local E5/live LLM chưa được xác minh thêm.
