# Giới hạn bản mẫu và điều kiện triển khai thực tế

Đây là ứng dụng trình diễn hư cấu, **không sẵn sàng sản xuất**. Dữ liệu Minh An, nhân viên, giá, hợp đồng, nhà cung cấp và giao dịch đều tổng hợp. Không có kết nối Vinmec/SAP/LLM/xác thực bên ngoài. Không dùng dữ liệu bệnh nhân hoặc hồ sơ thật.

| Thành phần hiện tại     | Giới hạn mô phỏng                                                                                                                                | Cần có trước sản xuất                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Chọn tài khoản/vai trò  | Frontend thay account để diễn vai, không password/SSO; DevTools có thể sửa dữ liệu                                                               | SSO/IdP, xác thực/ủy quyền phía máy chủ, scope đối tượng, quản trị quyền và kiểm thử truy cập                                                |
| localStorage            | Một trình duyệt, dữ liệu có thể bị sửa/xóa, giới hạn dung lượng, không đồng bộ; phát hiện tab khác không phải khóa giao dịch server              | Backend/database, giao dịch đồng thời, version/conflict policy, backup/restore và migration được quản lý                                     |
| Duyệt/audit             | Logic xác định và audit cùng commit cục bộ, không chữ ký số hoặc nhật ký chống sửa                                                               | Workflow được nghiệp vụ duyệt, danh tính người phê duyệt, phân tách nhiệm vụ server, audit bất biến và chính sách lưu trữ                    |
| SAP                     | Catalog, đối sánh và PO/receipt sinh trong state; lỗi adapter chọn bằng cấu hình                                                                 | Khảo sát SAP, hợp đồng dữ liệu/mapping, credential bảo vệ ở server, idempotency/retry/reconciliation và kiểm tra môi trường tích hợp         |
| AI                      | Intent/từ khóa/selector/trích đoạn xác định, đọc cùng state theo quyền; không LLM, embedding hoặc hiểu ngôn ngữ tự do                            | Quyết định có dùng LLM hay không, đánh giá grounding/ACL/riêng tư, quy trình phê duyệt nhà cung cấp, chi phí/giám sát và kiểm thử thất bại   |
| Tài liệu                | TXT/MD đọc cục bộ; PDF/DOCX dùng mẫu mô phỏng. Phát hiện PII bằng quy tắc minh họa, con người rà soát. Xác nhận đã đọc không phải chữ ký pháp lý | Parser/OCR được kiểm chứng, lưu trữ tài liệu bảo vệ, quy trình phân loại/PII, ACL và vòng đời phiên bản server, cơ sở pháp lý chữ ký nếu cần |
| Kho/cấp phát            | Theo bộ, không quy đổi cái/đôi; yêu cầu đồng phục bàn giao toàn bộ, PO nhận từng phần. Giá VND, không thuế/hóa đơn/kế toán                       | Master data/đơn vị/định mức đã xác nhận, đối soát vật lý, quy trình ngoại lệ/trả hàng và tích hợp kế toán                                    |
| Ngân sách/khoa/tháng    | Metadata PR và snapshot PO, không kiểm hạn mức ngân sách; tháng hiểu là dự kiến                                                                  | Xác nhận mã hạch toán, phân bổ từng dòng/hồ sơ, hạn mức và tháng dự kiến/thực tế                                                             |
| Giới tính/cỡ và tái cấp | SKU demo cấu hình dùng chung/nam/nữ, alias size; ngày cấp gần nhất chỉ tham khảo. Không khẳng định ma trận chính sách thực tế                    | Xác nhận chức danh–loại–giới tính–cỡ, quy tắc khi thiếu dữ liệu và cách xử lý đơn vị/tái cấp                                                 |
| Triển khai/vận hành     | Vite static prototype, chưa hạ tầng production, giám sát/SLA/DR hoặc kiểm thử tải                                                                | Security/privacy review theo dữ liệu và pháp luật áp dụng, kiểm thử tải/khôi phục, logging, hosting/network/backup được phê duyệt            |

Mặc định 3 bộ/người/năm và dự trữ 40% vẫn cấu hình được, được giữ theo proposal.md. Workbook không chứng minh cách quy đổi đơn vị, thời gian chờ tái cấp hoặc trình tự duyệt sản xuất khác. Cần xác nhận các câu hỏi ở [excel-alignment-report.md](excel-alignment-report.md#10-câu-hỏi-nghiệp-vụ-còn-mở); không tự biến màu Excel/ô trống/footer thành quy tắc.

Reset demo chỉ thay dữ liệu ứng dụng trong trình duyệt, cần xác nhận; không được coi là quy trình xóa/lưu trữ hồ sơ thật. Export/CSV và JSON tải về vẫn phải được xử lý theo mức nhạy cảm nếu sau này có dữ liệu thực. Bản mẫu hiện tại chỉ có dữ liệu tổng hợp.

## Giới hạn kiểm chứng bàn giao

Môi trường hiện tại chặn server HTTP cục bộ (`listen EPERM`), nên không xác nhận ứng dụng khởi động thành công qua mạng, các hành trình Chromium, responsive desktop/mobile, focus/touch, tải CSV, console/network hoặc ảnh cuối. Test logic/React bằng Vitest và production build là bằng chứng riêng, không thay browser verification.

Đã bổ sung Playwright cho cả năm kịch bản với bộ dữ liệu mới, kiểm tra điểm bắt đầu và kết quả, chụp các màn hình khi thực sự chạy được. Số ca và trạng thái thực thi cuối ở [demo-verification.md](demo-verification.md). **Không có ảnh giả hoặc tuyên bố browser đã qua khi chưa chạy.** Trước buổi demo live, cần chạy lại `npm run test:qa` trên máy mở được cổng cục bộ và Chromium, xem ảnh desktop/mobile, sửa lỗi nếu có và diễn tập theo [demo-guide.md](demo-guide.md).

## Cập nhật Phase 6.2

Bản online có session/credential và kiểm quyền máy chủ, State service một file/process và OpenRouter chỉ đọc; bản offline vẫn là RBAC/localStorage mô phỏng. Không SSO/MFA, không bảo mật sản xuất; không dữ liệu thật/SAP thật. Không embeddings hoặc semantic RAG. Model thực tế/credit chưa được kiểm bằng inference; E2E vẫn bị chặn bởi localhost EPERM. Xem [báo cáo triển khai](ai-openrouter-implementation.md).

## Cập nhật Phase 6.3

Phase 6.3 đã có pipeline local neural embeddings/hybrid và grounded generation, nhưng môi trường không có runtime/model E5 và DNS npm bị EAI_AGAIN; chỉ BM25 đã đo bằng corpus thật. Không gọi keyword là semantic; chưa đo E5 inference, semantic accuracy, latency/RSS hoặc live LLM generation. Citation/source integrity không chứng minh entailment; guard lexical/numeric/polarity có giới hạn. Browser bị chặn localhost EPERM; xem [kiểm chứng](ai-rag-evaluation.md). Không thực hiện Phase 6.4.

## Cập nhật Phase 6.4

Phase 6.4: 300 tests/TypeScript/build qua; 68 Playwright case chưa thực thi do webServer/localhost EPERM, không screenshot. NLU/context có phạm vi entity/filter hữu hạn, chưa đánh giá model thật hoặc assistive-technology/browser layout. Tham số context không phải bằng chứng dữ liệu hiện tại; không có write tools/auto-confirm. Các giới hạn semantic, generation/SSO/JSON storage của các phase trước vẫn áp dụng; xem [kiểm chứng](ai-ux-verification.md).
