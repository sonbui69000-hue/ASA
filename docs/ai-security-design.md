# Thiết kế quyền và an toàn AI — Phase 6.1

> Hiện trạng Phase 6.3: pipeline RAG đã được bổ sung; xem [triển khai](ai-rag-implementation.md) và [đánh giá](ai-rag-evaluation.md). Local E5 chưa provision được trong môi trường thực thi nên runtime hiện dùng BM25, không tuyên bố semantic đã hoạt động. Các mô tả phase cũ dưới đây là lịch sử.

> Cập nhật Phase 6.2: đã triển khai backend/tools theo [ai-openrouter-implementation.md](ai-openrouter-implementation.md). Tài liệu này giữ thiết kế tại Phase 6.1; trạng thái triển khai và khác biệt thực tế nằm trong báo cáo mới. Phase 6.3/semantic RAG chưa triển khai.

Trạng thái: thiết kế cho bước triển khai tương lai, chưa có session/backend hoặc cơ chế bảo mật mới được triển khai. Kiến trúc và lựa chọn nguồn state ở [ai-integration-plan.md](ai-integration-plan.md). **RBAC phía trình duyệt hiện tại là mô phỏng, không cung cấp bảo mật thật.** Thiết kế máy chủ dưới đây cũng chưa được kiểm chứng bảo mật sản xuất.

## 1. Tài sản và ranh giới tin cậy

| Tài sản / đầu vào                          | Độ tin cậy và nơi kiểm soát                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY`                       | Bí mật chỉ ở tiến trình máy chủ và header tới OpenRouter; không nằm trong prompt, DTO hoặc browser                                 |
| `OPENROUTER_MODEL`                         | Cấu hình máy chủ, không mặc định/hardcode/đổi theo lời model hoặc request client                                                   |
| Account/role/khoa/employee active          | Máy chủ đọc từ state đã quản lý, kết hợp credential do operator cấp; browser không cấp các claim này                               |
| Canonical State                            | Một nguồn chuẩn trên Node; chỉ command được xác thực/quyền/quy tắc mới commit. File và máy operator vẫn là trust boundary của demo |
| localStorage, route, câu hỏi, chat history | Không đáng tin; chỉ gợi ý, cache đã lọc hoặc dữ liệu chuyển đổi cần operator rà soát                                               |
| Tool name/arguments và output LLM          | Không đáng tin; schema, scope và evidence được kiểm lại bằng code                                                                  |
| Tài liệu đã rà soát/xuất bản               | Nguồn nội dung có quyền, **không** nguồn chỉ dẫn điều khiển tools/model/server                                                     |
| Chunk/vector/cache                         | Dữ liệu dẫn xuất, không cấp quyền và không thay state; hash/manifest phải khớp                                                     |
| OpenRouter và upstream provider            | Dịch vụ ngoài nhận tối thiểu câu hỏi và evidence tổng hợp; không thay hệ thống kiểm quyền                                          |

Chỉ dữ liệu tổng hợp của Bệnh viện Minh An demo; không dữ liệu bệnh nhân/nhân viên/hợp đồng thật. Không kết nối SAP thật. Mọi số liệu/quyết định nghiệp vụ vẫn được phần mềm tính xác định, không lấy kết luận của model làm quyền hay phê duyệt.

## 2. Hiện trạng và các khoảng trống đã thấy

- `asa-demo-account` và `Account` nằm ở browser; người dùng sửa được localStorage để đổi role/state/ACL. Chuyển `accountId` lên server rồi tra một account chuẩn **vẫn chưa xác thực danh tính** nếu mọi người được chọn bất kỳ account nào.
- `DemoStore` chứa toàn bộ dataset, gồm cả `documents.original`. Việc UI/selector không render không ngăn DevTools đọc. Không thể chỉ thêm API key proxy rồi tuyên bố bảo vệ dữ liệu của ứng dụng.
- `canReadDocument` hiện kiểm published/ngày/`readRoles`. `departmentId` không phải ACL khoa; `signRoles` chỉ cho xác nhận đã đọc. Không tự mở quyền đọc cho sysadmin.
- `isWide` hiện là mọi role ngoài `employee/coordinator/head`, khá rộng. Đây là policy mô phỏng thực tế, không phải ma trận quyền bệnh viện đã xác nhận.
- `stock/issued/committed/availableLockers/shortlist` không tự nhận actor. `requestsFor/purchasesFor` cấp quyền ở mức record; không đảm bảo mọi field/dòng của record đó đều được đọc.
- TypeScript `Command` và `State` không thay runtime validation của payload HTTP. `assertState` kiểm một số liên kết/invariant, chưa phải full security validator hoặc kiểm mọi FK/định danh trùng.
- `DemoStore.reset` dựa vào UI cho quyền; server tương lai không được giữ cách kiểm này. `State.operations` chỉ chứa ID, chưa gắn chủ thể/hash payload cho chống replay xuyên phiên.

Đây là các việc phải xử lý trước bật AI online, không phải xác nhận lỗi đã được sửa trong Phase 6.1.

## 3. Phiên và identity cho prototype local

Đề xuất tối thiểu: operator bootstrap **credential demo riêng cho từng account** trong tệp máy chủ ngoài static root, bỏ qua Git; hash có salt bằng `crypto.scrypt` và so sánh an toàn. Không hardcode passphrase trong frontend/seed, không dùng API key OpenRouter làm mật khẩu, không yêu cầu người dùng cung cấp khóa API mới.

`POST /api/session` nhận accountId + credential để **xin đăng nhập**, không nhận role/khoa/grants. Server kiểm credential, resolve account active từ State chuẩn, phát session ID ngẫu nhiên opaque ít nhất 256 bit trong cookie `HttpOnly; SameSite=Strict; Path=/`; thêm `Secure` khi chạy HTTPS. Local HTTP chỉ được bind loopback, được gắn nhãn demo; không đưa cookie vào localStorage. Server giữ session map riêng, idle timeout đề xuất 30 phút, absolute 8 giờ, xóa khi logout/restart. Rate-limit đăng nhập ban đầu 5 lần/phút/nguồn và session creation có giới hạn.

Role picker hiện tại cần chuyển thành lựa chọn account để đăng nhập/chuyển phiên có credential phù hợp. Không có API `switchRole(role)` mở cho browser. Nếu muốn đổi tự do trong một buổi trình diễn, operator có thể dùng nhiều phiên đã đăng nhập, nhưng người giữ credential của mọi vai trò thực chất có toàn bộ các quyền đó; không gọi đó là phân tách người thật. Test server có fixture credential riêng, không bypass ở server trình diễn.

Mỗi request resolve lại account/employee active/khoa/role hiện tại từ State; session không đóng băng quyền cũ. `employee.save` có thể đổi khoa account theo command hiện tại; policy ref phải đổi. Logout, ngừng nhân viên hoặc đổi quyền làm lượt AI đang chờ không được trả kết quả; UI phải bỏ response trễ của principal trước.

Đây là rào cản xác thực có ý nghĩa cho demo nhiều phiên, không SSO, MFA hoặc hệ thống định danh bệnh viện. Người có quyền OS/file/credential operator vẫn có thể sửa hoặc đóng mọi vai trò. Production cần IdP/SSO, quản lý session/secret, HTTPS và kiểm thử độc lập trước dữ liệu thật.

## 4. Policy đọc và projection

Khởi đầu tương thích quyền nghiệp vụ hiện hành, chuyển việc thực thi lên server và thêm projection; không tự tạo một vai trò mới từ chức danh nghề nghiệp. Mọi grant được tính từ principal/state/policy máy chủ, không từ tool arguments.

| Loại dữ liệu                  | Phạm vi nền hiện tại cần áp dụng trên server                                                                                       | Projection/hàng rào bổ sung                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Nhân viên, lịch sử cấp, quota | Employee: self. Coordinator/head: khoa. Nhóm `isWide`: phạm vi viện theo cấu hình demo hiện hành                                   | Chỉ field cần cho nghiệp vụ/tool, không raw danh bạ; phản hồi tên trùng chỉ ứng viên được phép                              |
| Yêu cầu đồng phục             | `requestsFor/canRequest`: khoa hoặc có dòng nhân viên self                                                                         | Nhân viên chỉ thấy dòng của mình, không tên/lượng/giá nhân viên khác trong request nhóm. Chỉ trả trạng thái chung được phép |
| Tồn kho                       | Kiểm grant kho do server định nghĩa trước `stock`; mặc định demo có thể cho tài khoản active xem số tổng `TT/NOI` như assistant cũ | Không gửi raw ledger, recipient IDs, giá lô hoặc lý do tự do. Mở kho ngoài allowlist không được phép                        |
| PR/PO/nhận hàng               | `purchasesFor`, PO phải có parent PR đọc được                                                                                      | PR được phép qua một nguồn không mở mọi dòng khoa khác; lọc dòng/field trước tổng hợp và gửi LLM, nhãn tổng trong phạm vi   |
| Mã NCC/mapping                | Catalog tổng hợp được cấp đọc; xác nhận mapping vẫn chỉ buyer qua form                                                             | Điểm/lý do xác định, không supplier credentials, không ghi mapping từ AI                                                    |
| Tủ trống                      | `availableLockers` + scope vị trí được cấp                                                                                         | Chỉ vị trí/trạng thái/khả năng đáp ứng, không identity từ lịch sử cũ                                                        |
| Tủ đã giao/giữ chỗ            | `canReadLocker`, employee/khoa theo mục tiêu được giao                                                                             | Dùng `lockerEventsFor` riêng cho lịch sử; không lộ người ngoài scope trong `from/to`, kể cả tủ đã trả                       |
| Tài liệu                      | `canReadDocument`: account active, published, đúng ngày và readRoles                                                               | Kiểm trước ranking/chunk/prompt/response/reader/export; không title/count/snippet trái ACL; sysadmin không mặc định bypass  |
| Original/draft/editor         | Quyền quản lý tài liệu riêng, không tool retrieval                                                                                 | Chỉ editor có quyền; không chat/index/cache browser hoặc audit chung                                                        |
| Audit/config                  | `auditsFor`, quyền cấu hình/module trên server                                                                                     | Không trả raw audit detail vào prompt. `sysadmin` cấu hình không mặc nhiên đọc mọi hợp đồng                                 |

Nhóm `isWide` bao gồm admin, warehouse, buyer, finance, leader, documents và sysadmin theo code hiện có; chuyển kiểm đó lên server không làm policy tự trở thành least privilege. Giảm quyền của từng nhóm hoặc thêm ACL khoa/tài khoản là quyết định cần xác nhận, không được nói đã được code hiện tại hỗ trợ. Server tách quyền đọc field giá/chi phí theo nhóm nghiệp vụ được cấu hình và giữ UI phù hợp.

Với nhân viên chuyển khoa: quota năm hiện tại vẫn tính toàn bộ issuance/cam kết hợp lệ để không cấp vượt. Đề xuất quyền xem **dòng lịch sử** của coordinator/head đòi cả membership hiện tại và `Issuance.departmentId`/request.departmentId phù hợp; tool eligibility chỉ trả số tổng cần thiết cho nghiệp vụ, không lộ chứng từ khoa cũ. Employee vẫn xem lịch sử của mình. Đây là chi tiết policy mới cần chốt và test, không phải chức năng đã có sẵn trong `employeesFor`.

Không chuyển State đã lọc thành một State giả đầy đủ để tính toán: stock/quota/shortage/report phải chạy trên state chuẩn đầy đủ ở server, sau đó chỉ project số/dòng được phép. Không render số tổng toàn viện rồi ẩn dòng để giả lập scope khoa. Với PR nhiều khoa, tổng chỉ từ dòng được phép; note tự do hoặc identity của khoa khác không tự đưa vào DTO.

## 5. Browser cache và nguồn chuẩn

Online không có endpoint trả raw State. DTO theo view/account/policy; cache localStorage chỉ các dữ liệu tổng hợp đã lọc mà policy cho phép, kèm workspace/revision/principal. Document text, original, passphrase, session token, raw model output và citation excerpts chỉ trong RAM hoặc không cache. Đổi phiên phải xóa cache/answer đang hiển thị của phiên trước; khóa riêng theo account không thay bước xóa/revalidate.

Để giữ demo cũ và giảm dữ liệu thừa cùng origin, online chạy origin mới như integration plan. LocalStorage offline cũ chứa toàn bộ dữ liệu vẫn thuộc chế độ mô phỏng; server auth không thể thu hồi bản sao cũ đã có trên máy. Shared workstation vẫn cần quy trình đóng phiên/xóa dữ liệu phù hợp; đừng tuyên bố một user switch xóa mọi dấu vết trong browser.

Không gửi snapshot localStorage vào chat; không tin role/ACL/entity liên kết trong một snapshot chỉ vì schema hợp lệ. Import JSON phải là công việc operator đã xác nhận, kiểm nguồn synthetic, account/ACL và invariant, không endpoint import mở cho tất cả tài khoản. UI import/reset không phải một tool LLM.

## 6. Bảo vệ HTTP và bí mật

- Bind loopback, cùng origin qua proxy dev hoặc Node phục vụ `dist`. Host/Origin allowlist cụ thể; không `Access-Control-Allow-Origin:*`. Kiểm Origin và token chống CSRF gắn session cho POST/DELETE, kể cả query AI gây chi phí. Không chỉ dựa vào SameSite.
- Route/method/body allowlist; JSON content type, query ≤16 KB; upload ≤200 KB, collection/chuỗi/array có giới hạn. Không nhận path filesystem, URL tùy ý hoặc executable arguments. Static handler chỉ đọc dist, chặn traversal/dotfiles/symlink ra ngoài root.
- `.env` chỉ dùng server loader; không tiền tố `VITE_`, không serialize `process.env`, không code client import `server/config`. Không có endpoint trả config/Authorization; error mapping không echo upstream request/stack.
- `.gitignore` đã bổ sung `.env`/`.env.*`, ngoại lệ `.env.example` sạch; `.env` giữ nguyên. Hiện thư mục không có Git repository hoạt động nên không thể xác minh tracked/history. Khi có repo thật phải kiểm index/history; nếu đã lộ thì thu hồi/rotate theo thực tế, ignore không đủ. Không xuất key để kiểm tra điều này.
- Khi triển khai, thêm thư mục state/credentials/usage/model cache riêng vào ignore và ngoài web root, quyền file hạn chế người vận hành. Không thêm chúng hay tạo credential trong Phase 6.1.
- Egress ứng dụng chỉ tới endpoint OpenRouter cố định, metadata công khai được định tuyến bởi code và local embedding đã provision. Không theo URL trong tài liệu; không bật web browsing/provider native tools/SAP thật. Giới hạn redirect để không gửi Authorization sang host khác.
- Render plain text/React an toàn, không `dangerouslySetInnerHTML`; link/citation do backend dựng từ route allowlist. Không để Markdown/HTML hoặc `javascript:` URL của model trở thành hành động.

## 7. Prompt injection và kiểm đầu ra

Nguồn có thể chứa “bỏ quyền”, fake system prompt, tool JSON, yêu cầu in API key, gọi URL hoặc đổi định mức. Dù được người quản lý publish, nội dung chỉ là dữ liệu. Đưa passage vào block có nhãn nguồn, không nối thành instruction hệ thống. Secret không nằm trong context nên model không có gì để đọc ra.

Các hàng rào phải bằng code:

1. Tool registry chỉ đọc, không có `execute`, approve, allocation, receipt, mapping.confirm hoặc tạo PO. Endpoint command dành cho form/session người dùng, không được orchestrator gọi. Không shell, eval, filesystem, generic fetch hoặc arbitrary database tool.
2. Tool arguments strict, session scope ngoài arguments, budget/call count cố định. Tài liệu không thể tăng quyền, đổi model, đổi origin/URL hoặc chọn principal.
3. Kết quả truy xuất không được tạo một kế hoạch tool mới dựa trên chỉ dẫn trong nguồn. Sau khi đã đủ evidence, final synthesis đặt `tool_choice=none`; tool family/purpose chỉ xuất phát từ câu hỏi người dùng và policy, không văn bản tài liệu.
4. Model chỉ trả claims gắn evidence IDs của lượt. Backend kiểm hash/version/span, record/field, các số/trạng thái và quyền trước gửi; không chấp nhận citation/href tùy ý. Câu trả lời không nguồn bị thay bằng thiếu bằng chứng hoặc trích đoạn xác định.
5. JSON hợp lệ không bảo đảm tóm tắt đúng. Với suy luận tài liệu chưa đủ căn cứ, hạ xuống extractive; đánh giá tiếng Việt có ground truth, không dùng một LLM judge làm hàng rào duy nhất.
6. Nếu tài liệu hoặc model bảo “đã duyệt/tạo PO/cấp tủ”, loại claim, trả rõ chưa ghi dữ liệu và chỉ cấp link form có quyền. Link form vẫn kiểm lại mọi rule sau người dùng xác nhận.

Prompt injection vẫn có thể ảnh hưởng cách diễn đạt của model; ràng buộc tools/schema/evidence giảm hậu quả chứ không chứng minh loại bỏ hoàn toàn. Cần test negative và đánh giá định kỳ khi đổi model/prompt.

## 8. Thời gian, cache và thu hồi giữa lượt

Snapshot/evidence gắn `(workspaceId, revision)` và policy fingerprint. Kiểm phiên tại đầu request, trước mỗi tool, trước provider call và ngay trước trả lời. Kiểm hash/phiên bản/ACL/expiry tài liệu lần cuối; `settings.date` là ngày nghiệp vụ, TTL phiên/deadline/rate limit dùng clock thật.

ACL/revoke/update/reset/đổi ngày hoặc identity giữa lượt làm answer stale, hủy request và không hiển thị snippet cũ. UI nhận command/ref mới thì ẩn answer ngay, abort fetch, ngăn response trễ ghi vào phiên mới. Poll/focus ref hỗ trợ tab khác; trên mạng có độ trễ không có bảo đảm thu hồi tức thì và không thể xóa nội dung người dùng đã đọc/sao chép.

Không lưu snippet trong sessionStorage. Giữ cơ chế chỉ lưu câu hỏi/context IDs hiện tại nhưng câu hỏi cũng có thể chứa thông tin do người nhập; giới hạn 30 lượt/500 ký tự, có nút xóa và không dùng dữ liệu thật. Không gửi lại raw answer/evidence cũ như memory đáng tin. Retrieval cache phải có principal/policy/stateRef/model/index generation hoặc bỏ cache để đơn giản.

## 9. Dịch vụ ngoài, log và chi phí

Chỉ gửi câu hỏi và bằng chứng tối thiểu đã được phép, dù synthetic. OpenRouter và upstream provider là các bên nhận dữ liệu khác nhau; không tuyên bố toàn bộ AI “chạy cục bộ” vì embedding local. Tài liệu [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection) phân biệt tùy chọn lưu nội dung và metadata; cấu hình/logging thực tế của tài khoản chưa được xác minh trong Phase 6.1.

Đề xuất policy `provider.data_collection=deny`, không tự nới nếu không có route đáp ứng; [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection) hỗ trợ lọc policy này. Nó không thay hợp đồng xử lý dữ liệu, đánh giá pháp lý, xác minh vùng lưu trữ hoặc bảo đảm không lưu dưới mọi hình thức. Chưa xác nhận provider/route nào cho model hiện tại đạt mọi yêu cầu; nếu không có route, fallback trong app.

Log chỉ allowlist: correlation ID ngẫu nhiên, principal pseudonym cục bộ nếu cần, tool name, mã lỗi chuẩn, duration, state ref, token/cost/generation ID. Không body/câu hỏi, Authorization/cookie, prompt, passage, nhân viên, original, raw error hoặc provider metadata có text tự do. Traces/screenshot/browser artifacts chỉ fixture tổng hợp, tuyệt đối không chụp `.env` hoặc network header key.

Usage ledger khác audit nghiệp vụ, có giới hạn dung lượng/retention đề xuất 7 ngày và quyền operator. Ghi cost unknown/reservation chưa đối soát khi timeout, không ghi 0; đếm mọi completion/repair/retry. Giới hạn request/session/concurrency/token/ngày kiểm trước egress; hết budget về deterministic, không tìm provider/model rẻ khác ngầm.

## 10. Điều kiện kiểm chứng và giới hạn sản xuất

| Tình huống tấn công/lỗi                                     | Kết quả bắt buộc khi triển khai                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------- |
| Sửa localStorage role/ACL, gửi `actorId` khác               | Không đổi principal/quyền server; không query raw snapshot            |
| Đăng nhập bằng accountId nhưng không credential, sửa cookie | 401 chung; không phát session                                         |
| Nhân viên đoán ID người khác/tài liệu/PO                    | Cùng response unavailable như ID không có; không title/snippet/count  |
| Request/PR nhiều người/khoa                                 | Không có field/dòng/giá/tổng trái scope trong DTO hoặc prompt         |
| Tủ trả hoặc chuyển người khác                               | Không lộ identity lịch sử ngoài quyền                                 |
| Revoke/ACL/đổi account trong lúc LLM chờ                    | Không trả answer của snapshot/phiên cũ; citation cũ bị chặn           |
| Source yêu cầu gửi key/state tới URL                        | Không network tới URL, không tool ghi, không secret trong context/log |
| Tool/schema/citation giả, JSON lỗi                          | Chặn trước resolver hoặc trước render; bounded fallback               |
| Query lớn/replay/cross-origin/CSRF                          | 4xx chuẩn, giới hạn tài nguyên; không upstream/commit sai             |
| Backend lỗi nhưng browser có cache cũ                       | Không ghi state offline ngầm, không trả LLM từ cache như dữ liệu mới  |

Trước production còn thiếu: SSO/IdP và account lifecycle thật, policy nghiệp vụ được phê duyệt, transactional multiuser storage, backup/restore và audit chống sửa, TLS/secrets management, quy định dữ liệu y tế và thỏa thuận provider, kiểm xâm nhập/đánh giá privacy, quan trắc/vận hành và kiểm chứng scale. File JSON một process/session demo không thay các mục đó. Phase 6.1 không chứng nhận bất kỳ kiểm thử bảo mật hay sự tuân thủ sản xuất nào.
