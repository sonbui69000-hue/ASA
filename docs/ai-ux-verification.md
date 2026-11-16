# Kiểm chứng UX trợ lý và tích hợp liên phân hệ — Phase 6.4

Ngày thực hiện: **11/11/2026, Asia/Bangkok**. Chỉ thực hiện [prompts/64.md](../prompts/64.md); không bắt đầu Phase 6.5. Tiếp nối [kế hoạch 6.1](ai-integration-plan.md), [OpenRouter 6.2](ai-openrouter-implementation.md) và [RAG 6.3](ai-rag-implementation.md).

## Kết quả và giới hạn xác minh

Đã cập nhật drawer hội thoại, context/clarification, retry/cancel/reset, nguồn có định danh và module reader. Giữ visual identity, màu/typography/surface tokens, Radix dialog/focus, bốn module và domain engine hiện có. Không dựng ứng dụng mới, không thêm dataset, không sửa command nghiệp vụ hoặc lắp dependency.

**TypeScript/build và 300 unit/component tests đã pass. Browser chưa được xác minh:** cả hai Playwright suite đã được gọi, nhưng webServer bị chặn; probe HTTP trực tiếp trả `EPERM 127.0.0.1:8080`. 68 case được discovery, 0 journey thực thi, 0 screenshot. Không suy responsive/accessibility/layout pass từ JSDOM hoặc việc đọc CSS. QA overall là incomplete.

Local E5 vẫn chưa provision được như Phase 6.3; không coi BM25 là semantic. Không chạy paid/live OpenRouter inference ở phase này; chất lượng diễn giải của model thật chưa đo. Các trạng thái degraded vẫn hiển thị rõ.

## Cải tiến giao diện

- Welcome có bốn nhóm Đồng phục/Mua sắm/Tủ đồ/Tài liệu, gợi ý theo module đang mở, dùng câu hỏi tiếng Việt. Chọn nhóm đổi gợi ý, chọn câu gửi truy vấn có nguồn.
- Phân biệt khối “Bạn” với câu trả lời; bảo toàn xuống dòng trong phản hồi, nguồn và ID dài được wrap. Không hiển thị tool-call JSON/function names cho người dùng thông thường.
- Thanh context hiển thị chủ đề, mã/biến thể/cỡ/tầng hoặc bộ lọc chờ duyệt của lượt trả lời hiện hành. “Chủ đề mới” giữ lịch sử để đọc, xóa context server và đánh dấu ranh giới cho các lượt tiếp theo. “Xóa hội thoại” xóa cả history client và context server.
- Composer nhiều dòng, Enter gửi, Shift+Enter xuống dòng; không gửi trong IME composition. Giới hạn 500 ký tự có bộ đếm. Pending chỉ một request; có loading/status, hủy, giữ câu hỏi và thử lại.
- Hủy khác lỗi provider: thông báo đã hủy, bỏ response tới muộn, không bịa câu trả lời và không tự ghi nghiệp vụ. Có thể hủy cả lượt tra cứu local đang chờ timer.
- Retry cập nhật đúng lượt cũ, không nhân đôi cả hội thoại; dùng parent context ban đầu. Thất bại xóa context có thông báo và retry, đồng thời lượt hỏi sau gửi resetContext để không âm thầm mượn memory cũ.
- Tên/mã nhiều ứng viên có nhóm nút chọn rõ. Chọn chỉ gửi truy vấn đọc mới; không chọn ngẫu nhiên một nhân viên/sản phẩm và không duyệt giao dịch. Các ứng viên được lấy lại từ nguồn đã lọc quyền.
- Nhãn phân biệt “Trả lời AI có nguồn”, “AI chọn công cụ”, “Dữ liệu nghiệp vụ”, “Trích đoạn tài liệu”, “Tra cứu theo quy tắc” và fallback. Token/cost ở disclosure “Chi tiết phản hồi”, không chiếm phần đọc chính. Source cards chứa dữ liệu thực tế và link để đối chiếu.
- Giữ vị trí khi người dùng cuộn đọc lịch sử; có “Xem tin mới”. Drawer giữ focus trap/Escape/return focus của Radix và focus ring. Mobile dùng textarea 16px, controls chạm được, dvh/safe-area và surface tokens đang có; các quy tắc này đã implement, chưa có screenshot browser xác minh.

Đã sử dụng skill [UI/UX Pro Max](../.agents/skills/ui-ux-pro-max/SKILL.md): truy vấn hướng dẫn conversational clarification, keyboard/focus, search/error và mobile touch. Giữ design system trong `src/styles.css`, không lấy một palette hoặc theme mới. Đọc [Playwright skill](../.agents/skills/playwright/SKILL.md), kiểm npx có sẵn, bổ sung vào suite Playwright mà repository đang dùng theo yêu cầu kiểm thử của Prompt 6.4.

## Context, clarification và ranh giới phiên

Online context do server quản lý. Client chỉ gửi question, expectedStateRef, requestId, optional replyTo/resetContext và route record hint như trước; không gửi role, actorId, snapshot hoặc answer cũ. replyTo chỉ tra trong Map của đúng session/workspace, không là grant đọc dữ liệu. Đoán ID của phiên khác không truy xuất được context.

`ToolResult.context` chứa intent/filter đã thực sự dùng bởi validated resolver. Trước đây kết quả tool có thể kế thừa intent của fallback không liên quan; nay context lấy từ công cụ đã resolve, rồi decorate bằng các record được phép. Không dùng lời văn model làm số liệu hoặc entity authority.

Mỗi session giữ tối đa 30 context entries: câu hỏi, parent ID, intent, tham số và record IDs; không lưu source excerpt/answer JSON vào memory. Prompt chỉ dùng tối đa ba câu hỏi của nhánh liên quan và filter đã resolve. Chuyển module rõ ràng bỏ ngữ cảnh/những câu hỏi thuộc chủ đề cũ khỏi prompt. “Chủ đề mới”/clear tăng conversation revision và xóa context; workspace reset/import không dùng context cũ. Backend restart hoặc context bị evict thì yêu cầu nêu mã/câu đầy đủ khi không còn đủ căn cứ.

Browser sessionStorage tiếp tục chỉ giữ 30 câu hỏi/context IDs và trạng thái UI tối thiểu theo account, có workspace marker và new-topic boundary. Answer/excerpt chỉ ở RAM. Không thêm dữ liệu hội thoại vào localStorage; localStorage online vẫn là scoped inventory/ref cache. History hồi phục không tự gọi LLM hàng loạt. Mỗi lượt mới hoặc retry chủ ý mới gọi endpoint.

Sau business commit/ref/ACL đổi: ẩn answer/source cũ, abort request đang chạy và không nhận late response. Tham số context là hint để tra lại dữ liệu hiện hành, không phải facts cache; mọi tool và reader vẫn kiểm quyền lại. Role switch qua credential/session như Phase 6.2; chọn account hoặc sửa localStorage không cấp quyền server.

| Tình huống                                                | Kết quả đã kiểm bằng unit/API/RTL                                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| “Áo blouse nữ cỡ L còn bao nhiêu?” → “Thế cỡ XL thì sao?” | Giữ category/gender người dùng đã yêu cầu, thay cỡ, bỏ code cỡ cũ; trả nguồn đúng SKU tìm được, không bịa biến thể thiếu |
| Tồn kho DP-DD-M → size L, model lặp lại code cũ           | Server refine read filters từ nhánh đã resolve; không dùng số của SKU M làm số L                                         |
| Đơn mua chờ duyệt → đơn liên quan đồng phục               | Giữ purchase status pending; mọi PR ở module hiện là các dòng đồng phục, không dựng dataset mua sắm mới                  |
| Nhiều PR/nhân viên/sản phẩm → “đơn/người/mã này”          | Hỏi chọn nguồn; choices được kiểm scope hiện tại, không chọn một record bất kỳ                                           |
| Hợp đồng → “Cho tôi xem điều khoản liên quan”             | Giữ câu hỏi tài liệu/record đã resolve; retrieval lại nguồn được phép, giữ version/mục                                   |
| Tồn kho → tủ trống tầng 3                                 | Chuyển module bỏ filter sản phẩm khỏi prompt/filter tủ                                                                   |
| Retry câu size sau khi chuyển sang hỏi tủ                 | Retry tham chiếu parent của câu size, không mượn nhánh tủ hiện tại                                                       |
| Token context từ session khác hoặc bị xóa                 | Không mượn context/đáp án của session khác; hỏi lại khi câu fragment thiếu căn cứ                                        |
| Câu đề nghị phê duyệt/cấp/PO                              | Không có command tool; đọc hướng dẫn và link tới workflow hiện hành, cần người dùng xác nhận ở đó                        |

Các parser/guard vẫn có phạm vi NLU hữu hạn; không tuyên bố hiểu mọi câu tiếng Việt. Intent/filters là phương tiện tra cứu, không thay domain rules. Số liệu và eligibility vẫn đọc stock/issued/committed/selector/engine hiện có. Live interpretation, nội dung generated và semantic quality chưa được đánh giá thêm ở phase này.

## Điều hướng nguồn và liên phân hệ

| Nguồn                                      | Điểm đến được hỗ trợ                              | Hành vi                                                                                             |
| ------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Sản phẩm/tồn kho                           | `/dong-phuc/kho?sku=<stable-id>&warehouse=TT/NOI` | Chọn đúng SKU/kho, có thông báo nguồn và nút xóa bộ lọc; không tự điều chỉnh kho                    |
| Nhân viên                                  | `/dong-phuc/nhan-vien?employee=<stable-id>`       | Mở modal lịch sử cấp của employee trong employeesFor; URL ngoài quyền chỉ hiện unavailable          |
| Một dòng cấp phát                          | Hồ sơ yêu cầu cấp phát cha                        | Đọc chi tiết giao dịch/giá lịch sử đã có; không tạo một route issuance giả                          |
| Yêu cầu đồng phục                          | `/dong-phuc/yeu-cau/<id>`                         | Mở hồ sơ hiện hành, vẫn kiểm permission/transition hiện có                                          |
| PR                                         | `/mua-sam/de-nghi/<id>`                           | Mở đúng đề nghị thuộc purchasesFor, không tự approve                                                |
| PO/phiếu nhận                              | `/mua-sam/don-hang/<order-id>`                    | Phiếu nhận trỏ parent PO có thật; không tự nhận hàng hoặc tăng tồn                                  |
| Tủ cụ thể                                  | `/tu-do?locker=<id>`                              | Lọc đúng record còn được phép; xóa filter để quay về danh mục                                       |
| Danh mục tủ trống                          | `/tu-do?status=available&floor=...`               | Mang filter vị trí, vẫn loại occupied/held/maintenance theo selector                                |
| Tài liệu                                   | Physical ID + version/chunk/section của Phase 6.3 | Không sửa/relabel citation thành version mới; source reader recheck ACL/hash/version trước hiển thị |
| Cấu hình, đối sánh NCC, hướng dẫn workflow | Route module thực sự đang có                      | Chỉ dẫn tới module khi chưa có reader riêng; không bịa detail URL                                   |

`sourceHref` dựng link từ record thực sự trong view/current permission; chặn URL ngoài allowlist hoặc record path không có. Những cite tài liệu hợp lệ giữ nguyên object/href để không phá kiểm chunk/hash. Link không tự cấp quyền, không thực hiện transaction và không thay kết quả nghiệp vụ.

UI và assistant cùng dùng StateRepository online; offline vẫn dùng DemoStore/localStorage cũ. 270 test từ các phase trước tiếp tục chạy, gồm command→tool thấy tồn mới sau cấp phát/nhận PO, tủ thay khả dụng sau allocation, published version mới thay nguồn cũ. Test mới kiểm thêm allocation thật→conversation mới không còn tủ đã cấp, normal form/profile navigation, no-write khi chat. Chưa xác minh các workflow qua browser trong môi trường bị chặn; không lấy unit/API pass làm bằng chứng UI E2E pass.

## Môi trường và bảo toàn ứng dụng

Không sửa `.env`: server vẫn chạy `node --env-file-if-exists=.env dist-server/index.js`, dùng đúng OPENROUTER_API_KEY và OPENROUTER_MODEL. Không hardcode giá trị hoặc chuyển key sang VITE_/browser. Các test dùng synthetic transport, không đưa existing key vào request mock hoặc report. Kiểm presence chỉ in boolean; quét key thực tế trong source/docs/build/reports không thấy giá trị key.

Không sửa domain command/selector tính quota, reserve, FIFO, approval, historical prices, PR→PO→receipt, document lifecycle hoặc locker allocation. Chỉ mở rộng read context/routing, presentation và navigation/filter reader. Không gọi SAP thật; AI vẫn read-only. Session/JSON/localStorage prototype không được mô tả là bảo mật enterprise, SSO hoặc RBAC sản xuất.

## File thay đổi chính

| Khu vực                          | File                                                                                                        |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| UI và styling                    | `src/features/assistant.tsx`, `src/styles.css`                                                              |
| Source readers                   | `src/features/uniforms.tsx`, `src/features/lockers.tsx`                                                     |
| Shared conversation/presentation | `src/domain/assistant.ts`, `assistant-routing.ts`, `assistant-presentation.ts` (mới)                        |
| Backend memory/metadata          | `server/assistant.ts`, `conversation.ts` (mới), `tools.ts`, `auth.ts`, `app.ts`                             |
| Protocol/client                  | `src/online/protocol.ts`, `src/online/client.ts`                                                            |
| Kiểm thử mới                     | `src/domain/conversation.test.ts`, `server/conversation.test.ts`, `src/test/assistant-ux.test.tsx`          |
| Browser/expectation cập nhật     | `tests/e2e/online-server.ts`, `online.spec.ts`, `server/integration.test.ts`, `src/test/workflows.test.tsx` |
| Tài liệu                         | Báo cáo này, README, assistant/architecture/limitations và pointers ở các phase cũ                          |

Hai assertion lịch sử được cập nhật theo hành vi chủ ý: inventory link có SKU/kho thay vì generic module; tên nhân viên trùng được hỏi rõ trước paid model call thay vì phải gọi một completion. Các assertions về quyền/no-write/dữ liệu thực vẫn giữ. Ghi nhận và sửa trong test mới: giữ gender người dùng khi record phù hợp là unisex, nhận dạng “đơn mua”, normalize chữ Đ khi hỏi rõ, và clear/retry đúng nhánh.

## Kết quả kiểm thử thực thi

Lượt `npm run test:qa` cuối: **2026-11-10T17:15:42.649Z–2026-11-10T17:16:09.389Z**. Các bước được gọi từ QA: tsc, Vite offline/online/backend, RAG evaluator, Vitest, Playwright CLI cho cả hai suite. Artifacts: `output/qa/summary.json`, `vitest.json`, `rag-evaluation.json`; browser reports ở `output/playwright/` và `output/playwright-online/`.

| Kiểm tra                                          | Kết quả                                                                           |
| ------------------------------------------------- | --------------------------------------------------------------------------------- |
| TypeScript                                        | Pass, exit 0                                                                      |
| Production builds: offline / online / Node server | Cả ba pass, exit 0                                                                |
| Vitest/RTL                                        | **300 pass, 0 fail, 0 skip**, 23 test files                                       |
| So với Phase 6.3                                  | 270 test nền + **30 test mới** đều pass                                           |
| RAG evaluator                                     | Pass BM25/citation checks; không thay trạng thái semantic thành ready             |
| Playwright offline                                | 48 đăng ký; webServer blocked, 0 case chạy                                        |
| Playwright online                                 | 20 đăng ký, gồm 10 case UX mới qua desktop/mobile; webServer blocked, 0 case chạy |
| Screenshot/layout browser                         | **0 screenshot**, chưa xác minh responsive bằng browser                           |
| Localhost probe trực tiếp                         | `EPERM 127.0.0.1:8080`                                                            |
| Prettier và key scan                              | Được kiểm riêng trước bàn giao; không in giá trị key                              |
| Dependency/lockfile                               | Không cài thêm, package-lock/skills-lock giữ nguyên                               |

**QA trả exit 1 / incomplete vì browser bị chặn.** Không tự bypass sandbox hoặc tuyên bố Playwright pass. Normal tests không yêu cầu paid API. Các journey online mới có screenshot checkpoints cho context/clarification, keyboard Enter, nguồn SKU, pending PR, new-topic/cancel/retry và employee permission; phải chạy trên máy mở localhost được để tạo screenshot thật.

## Vận hành lại và phần còn thiếu

```bash
npm run build
npm run server
# Mở http://127.0.0.1:8080; dùng mã account demo đã provision ở .local/online/access-codes.json
npm run test:qa
```

Không in access codes hoặc API key. Nếu cần phát triển UI online: backend trên 8080, `npm run dev:online` trên 5174. Không đổi server data authority hoặc tự merge localStorage offline.

Còn thiếu xác minh browser/screenshot/responsive ở host cho bind port; E5 local runtime/model và semantic evaluation; live model behavior, generation quality, cost/credit/provider route; kiểm accessibility thực với assistive technologies. Context hỗ trợ tập entity/filter hiện có, không phải arbitrary long-term memory. Source cho danh mục chưa có reader riêng chỉ mở module; không có assistant write tools hoặc workflow auto-confirm. Phase 6.5 chưa được đọc/triển khai.
