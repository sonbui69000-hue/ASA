# Kiểm chứng AI và mức sẵn sàng trình diễn — Phase 6.5

Ngày thực hiện: 11/11/2026 (UTC+7). Phạm vi: [Prompt 6.5](../prompts/65.md), ứng dụng bốn phân hệ hiện có. **Chưa đủ điều kiện trình diễn trực tiếp đầy đủ OpenRouter + semantic RAG.** Logic, API, component và build đã được chạy kiểm chứng; browser, live inference và local semantic inference còn bị chặn. Không dùng unit pass để thay kết quả trình duyệt.

## Môi trường và tài liệu đầu vào

Đã đối chiếu `AGENTS.md`, thiết kế Phase 6.1 (`ai-integration-plan`, `ai-tool-registry`, `ai-rag-design`, `ai-security-design`, `ai-implementation-checklist`), [triển khai 6.2](ai-openrouter-implementation.md), [triển khai 6.3](ai-rag-implementation.md), [đánh giá RAG](ai-rag-evaluation.md), [kiểm chứng UX 6.4](ai-ux-verification.md), [kiểm chứng demo Phase 5](demo-verification.md), code assistant/session/state/tools/retrieval/generation và các tests hiện hành. Báo cáo phase cũ giữ kết quả lịch sử; báo cáo này là trạng thái cuối Phase 6.

- Linux x64; Node **26.9.0**, npm **12.2.0**; TypeScript 6.0.3, Vitest 5.1.0, Vite 8.3.7, Playwright 1.65.0 theo project đã cài. Không cài dependency hoặc browser mới, không sửa lockfile.
- Model từ `.env` hiện có: **`openai/gpt-4.1-mini`**. Giữ đúng `OPENROUTER_API_KEY` và `OPENROUTER_MODEL`; không in, sao chép hoặc lưu key vào báo cáo.
- Corpus/đối tượng hoàn toàn synthetic, `createSeed()` schema v2; ngày nghiệp vụ **10/11/2026** khác ngày đồng hồ thật. SAP vẫn mô phỏng.
- Online: Node canonical repository + session; offline: DemoStore/localStorage origin riêng. Tests dùng workspace tạm, không reset/import dữ liệu online người dùng đang lưu. Không có suite tự động nào dùng paid API.

## Kết quả chạy thực tế

Artifacts mới nhất: `output/qa/summary.json`, `vitest.json`, `ai-evaluation.json`, `rag-evaluation.json`, `live-smoke.json`, `security-audit.json`; log tổng `phase65-run.log`. Các file này được sinh khi chạy và được Git ignore. Không cần `.env` cho normal regression QA.

Lượt QA cuối: **2026-11-10T17:36:22.307Z–17:36:49.874Z** (00:36 ngày 11/11, UTC+7). Live smoke: **17:27:57.288Z–17:27:57.462Z**. Secret scan sau khi viết hai tài liệu: **17:39:43.049Z**, 213 working/build/report files, zero exact-key matches; không gồm `.env` cần giữ bí mật.

| Kiểm tra                                     | Kết quả                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| TypeScript toàn UI/backend/E2E               | Pass, exit 0                                                                         |
| Build production offline / online / Node SSR | Cả ba pass, exit 0                                                                   |
| Vitest/RTL, toàn suite                       | **326 pass / 0 fail / 0 skip**, 27 tệp                                               |
| Thay đổi so với Phase 6.4                    | 300 tests cũ + 26 tests mới chạy qua                                                 |
| AI local evaluation                          | **48 câu**, 45 đúng fallback; 41/41 explicit tool contracts đạt                      |
| RAG evaluation                               | 30 câu dương + 5 câu âm; xem metrics dưới                                            |
| Playwright offline                           | 48 đăng ký; **0 chạy, 48 chưa thực thi**, webServer blocked                          |
| Playwright online                            | 20 đăng ký; **0 chạy, 20 chưa thực thi**, webServer blocked                          |
| Playwright legacy runner                     | Đã thử; blocked vì không có executable Chromium, 0 journey                           |
| Screenshot / console browser thực            | **0 ảnh**, chưa có kết quả console/layout browser                                    |
| `npm run rag:check`                          | Exit 1, `semantic_unavailable`, dimension null                                       |
| Live OpenRouter smoke                        | Đã thử 1 câu; **blocked / EAI_AGAIN**, 1 metadata request, **0 completion requests** |
| Quét chính xác giá trị API key               | Không thấy trong source/docs/builds/test artifacts được quét; chi tiết dưới          |

`npm run test:qa` trả **exit 1 / incomplete**, không phải overall pass. 48 câu AI và 35 câu RAG là số lượt đánh giá, **không cộng thêm thành 83 Vitest test cases**. Tool fixtures chứng minh hợp đồng và record access, không chứng minh model tự chọn đúng tool.

Các lệnh tái lập:

```bash
npm run test:qa
npm run rag:check
npm run ai:evaluate
npm run ai:security
# Có chủ ý dùng API trả phí; không thuộc test:qa hoặc Vitest:
npm run ai:smoke -- --confirm-paid
```

## Hiểu câu hỏi và chọn đúng record

Dataset cố định ở [server/evaluation.ts](../server/evaluation.ts): **NL01–NL48**, gồm inventory 6, eligibility 4, history 4, purchasing 5, approval 1, product/mapping 4, locker 4, document 4, follow-up 4, ambiguity 3, outside-data 3, permission 2, misuse 2 và paraphrase 2. Có tiếng Việt không dấu, cách hỏi thân mật, mã cụ thể, thay cỡ/tầng, nhánh PR và điều khoản liên quan.

Phương pháp tách ba trục:

1. Chạy `answerQuery(projectView(...))` thật, so intent/status và record IDs kỳ vọng, không chấm văn phong: **45/48 = 93,75%**. Đây là **fallback cục bộ**, không phải accuracy của OpenRouter.
2. Với 41 câu có tool fixture, gọi registry/selector/quyền thật bằng input kỳ vọng tường minh, kiểm record IDs hoặc từ chối: **41/41**. Các tests `verification`, `conversation`, `integration` còn chạy orchestrator thật với mock transport để kiểm ID selection, context, tool protocol và current state. Input tool fixture không phải dự đoán của model.
3. Chọn tool/NLU của model thật: **chưa đo được**, vì live smoke bị DNS chặn trước completion. Không công bố “48 câu online AI pass”. Dataset có sẵn để chạy đánh giá model thật có giới hạn/người rà soát sau này; không tự đưa cả bộ vào paid API.

Ba thất bại fallback còn lại, giữ nguyên ground truth:

| ID / câu hỏi                                                                | Kỳ vọng              | Kết quả thật / giới hạn                                                                                   |
| --------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------- |
| NL30 — “Hợp đồng An Tâm cho giao hàng sau bao nhiêu ngày?”                  | `DEMO-TL-004`, buyer | Intent đúng nhưng fallback keyword cũ trả empty do yêu cầu mọi từ khớp; tool BM25 contract lấy được nguồn |
| NL32 — “Nhân viên cần làm gì khi muốn xin cấp lại đồng phục vượt định mức?” | `DEMO-TL-002`        | Đã sửa intent thành policy; fallback keyword cũ vẫn empty; BM25 lấy được nguồn                            |
| NL48 — “Mình cần chỗ cất tư trang ở lầu ba, còn ngăn nào rảnh?”             | Locker availability  | Parser fallback trả unsupported, không đoán số lượng hoặc vị trí                                          |

Các lỗi này là giới hạn đo được, không được che bằng đổi câu hỏi/ground truth hoặc gắn nhãn keyword thành semantic. Harness ghi từng failure, khóa 45 câu còn lại chống regression. Tất cả 48 lượt và 41 tool checks không đổi State.

## RAG: relevance, version, citation và evidence

Chạy lại `DocumentIndex` trên chính 30 câu của [bộ đánh giá](../server/rag/evaluation.ts), limit 3, cùng corpus/ACL/version. Nguồn chuẩn và bảng từng câu nằm trong [báo cáo RAG](ai-rag-evaluation.md); JSON mới ghi từng rank/actual source và citation check.

| Chỉ số                                                | Kết quả đo                                   |
| ----------------------------------------------------- | -------------------------------------------- |
| BM25 Recall@3                                         | **28/30 = 93,33%**                           |
| MRR@3                                                 | **0,8556**                                   |
| Câu thường                                            | 26/26 đúng mục trong top 3                   |
| Paraphrase ít trùng từ                                | **2/4 = 50%**                                |
| Citation record/version/section/span/hash/current ACL | **88/88 hợp lệ**                             |
| Ngoài quyền/draft/revoked/expired/fabricated ID       | **5/5** trả zero passage                     |
| Semantic/hybrid model quality                         | **Chưa đo**, local E5/runtime chưa provision |
| Live generation/abstention/claim accuracy             | **Chưa đo**, không có completion thật        |

Hai lỗi retrieval được báo riêng:

- “Nếu không đủ chỗ giữ tư trang thì hệ thống có tự chia bớt suất còn lại?” — kỳ vọng `DEMO-TL-005` v1 / `muc-2`, không trong top 3 BM25.
- “Cần báo gì lúc đổi người giữ ngăn cá nhân?” — cùng nguồn/mục, không trong top 3 BM25.

Tests RAG/backend/UI kiểm thêm: published archive v2 vẫn được đọc khi v3 draft; publish v3 loại citation cũ; ACL/revoke/date/hash/ref thay đổi làm source invalid; không index original/draft; source reader recheck và highlight span; thiếu chứng cứ abstain; quote/ID/số/phủ định/URL giả bị loại; provider hoặc generation sai thì trả extractive có nhãn. Neural vectors trong tests chỉ là plumbing fixture, không phải inference E5. **88 citation có thật không đồng nghĩa 88 passage đều liên quan hoặc mọi diễn giải đều đúng.** Guard lexical/polarity chưa là entailment verifier.

## Bảo mật và misuse

Tests được thực thi với synthetic credentials/key. Không dùng hoặc in key thật trong tests. Evidence nằm ở [integration tests](../server/integration.test.ts), [RAG tests](../server/rag/rag.test.ts), [verification tests](../server/verification.test.ts), [HTTP tests](../server/http.test.ts), conversation/online RTL tests.

| Kiểm tra                                                                    | Kết quả thực thi                                                                                               |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Unauthorized document/metadata/source; sysadmin không có document ACL       | Deny chung, không passage/title hạn chế; lọc trước ranking/statistics                                          |
| Nhân viên ngoài self/khoa; grouped/mixed-scope PR/PO                        | Resolver/projectView không lộ dòng/identity ngoài scope; tổng stock/quota tính trên canonical trước projection |
| Prompt injection trong tài liệu                                             | Evidence ở user JSON `EVIDENCE_UNTRUSTED`; fresh generation không có tools; mở rộng sang employee tool bị chặn |
| Override quota/duyệt/cấp/PO từ chat                                         | Registry chỉ đọc; command không có trong allowlist; action mở workflow xác nhận riêng; State không đổi         |
| Yêu cầu in key / `read_environment` / prose giả chứa secret                 | Unknown tool hoặc output schema bị chặn; prompt và reply không chứa synthetic test secret                      |
| Tool lạ, arguments giả role/actor, sai quantity/size/JSON, forged result ID | Bị schema/registry/evidence validator chặn và fallback có nhãn                                                 |
| Tên nhân viên trùng                                                         | Hỏi chọn mã trong phạm vi, không gọi dependent tool bằng người đoán                                            |
| Mã DP không tồn tại / document ID giả                                       | Không thay bằng SKU/document gần giống, không tạo citation giả                                                 |
| Excessive loops                                                             | Cap 6 tools / 2 tool rounds / 3 completions                                                                    |
| Timeout/abort/429/401/402/5xx/malformed/HTTP-200 error                      | Controlled fallback/cooldown, không render raw provider error hoặc crash                                       |
| Forged role/localStorage, session/CSRF/Origin, stale/ref/logout/reset       | API/unit tests qua; browser attack journeys chưa chạy được                                                     |
| Static `.env`/dotfile/traversal/symlink/foreign Host/oversize body          | 8 HTTP-handler tests qua, không bind socket; no secret file served, safe exceptions, CSP/nosniff               |

Native Node env loader xác nhận cả hai biến. Transport mock-wire test xác nhận **configured model** trong JSON và key chỉ ở Node Authorization header; metadata request không mang key, redirect bị cấm. Live smoke chưa tới completion, nên không tuyên bố provider đã chấp nhận model/key/credit.

`npm run ai:security` dùng exact key match trong source, docs, tests, scripts, frontend/backend builds và output artifacts; không in giá trị match. Không tìm thấy key. Online JS không chứa tên hai biến môi trường, embedding runtime hoặc marker đáp án hợp đồng hạn chế. `.env` nội dung/hash giữ nguyên; **đã siết quyền file từ 0644 xuống 0600**. Thư mục `.local/online` 0700; state/credential/access-code files 0600. Key không có trong prompt/browser DTO theo code và tests. Không có screenshot thực nên không tuyên bố đã kiểm mắt trên ảnh.

**Git index/history chưa xác minh:** thư mục hiện không có Git repository hoạt động; `git ls-files` thất bại. `.gitignore` loại `.env`, `.local`, builds/reports, nhưng ignore không chứng minh key chưa từng bị commit. Không tuyên bố tracked/history sạch.

Đây là prototype nhiều account do operator giữ demo credentials, không SSO/MFA hay authorization sản xuất. Offline localStorage chứa synthetic State và sửa được bằng DevTools; online JSON một process, demo role policy vẫn rộng. OS operator có quyền sửa dữ liệu/credential. Không dữ liệu bệnh viện thật, không SAP thật; external processing chỉ OpenRouter với synthetic authorized data. Chưa kiểm privacy/retention/vùng dữ liệu của tài khoản provider hay pentest độc lập.

## Nhất quán liên phân hệ

[server/verification.test.ts](../server/verification.test.ts) dùng command engine + repository thật, hỏi lại qua AssistantService và scoped tools thật; chỉ mock model chọn tool. [ai-consistency.test.ts](../src/test/ai-consistency.test.ts) dùng localStorage thật của jsdom. Mỗi test kiểm chat không ghi State.

| Workflow                               | Quan sát sau commit và hỏi lại                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1. Cấp `DEMO-YC-001`                   | DP-DD-M vật lý **10→8**, giữ **2→0**, khả dụng **8→8**; không nói khả dụng giảm lần hai                       |
| 2. Tạo/duyệt PO 2 bộ, nhận 1           | Vật lý **10→11**, giữ 2, khả dụng **8→9**; PO nhận 1/2, còn 1; disk reload giữ cùng State                     |
| 3. Duyệt PR                            | Trả “Đã duyệt”; PR mới không còn trong pending; tồn vẫn 10/2/8 khi chưa nhận                                  |
| 4. Cấp `DEMO-TU-041` cho `DEMO-NV-001` | Tủ trống **37→36**; assignment trả đúng ID tủ mới                                                             |
| 5. Tạo/rà soát/publish tài liệu Zebra  | Draft không là evidence; sau publish trả grounded claim và citation đúng nguồn mới                            |
| 6. Thu hồi `DEMO-TL-004`               | Lượt mới không evidence; citation trước thu hồi invalid                                                       |
| 7. localStorage reload                 | Kiểm kê +2 và cấp tủ được hydrate; trợ lý đọc **12/2/10**, **36 tủ**                                          |
| 8. Reset                               | Workspace online đổi; offline hydrate sau reset trở lại **10/2/8**, **37 tủ**, NV031 đã cấp 2/cam kết 0/còn 1 |

Những kiểm tra này không thay browser workflow. Các hành động trên không thực hiện lên dataset người dùng đang lưu.

## Browser, hình ảnh và sửa lỗi

Đã chạy cả hai Playwright configurations với desktop 1440×1000 và mobile Pixel 7, tiếng Việt, timezone Asia/Bangkok, reduced motion; cả hai dừng ở khởi động webServer. Probe localhost mới trả **`EPERM`**. Legacy runner thử launch thật và báo thiếu `chromium_headless_shell-1254` executable. Không bypass restriction bằng app giả hoặc tạo screenshot dựng.

Online specs đã có context, hỏi rõ, tool result/source, exact citation highlight/revoke, source navigation, role switch, retry/cancel, layout và stock update/reload. Bổ sung checkpoint ảnh loading (`aria-busy`), provider fallback, citations, reader highlight; fixture đính kèm console errors/page errors (negative permission journeys cố ý có HTTP 404). **Chưa có browser console capture, screenshot, clipping/focus/touch/layout review thực tế.** Những checkpoint mới đã typecheck/discover nhưng chưa execute.

Đã dùng installed Playwright skill và UI/UX Pro Max review guidance về loading/busy, recovery, focus, layout, giữ design system hiện có. Không redesign. Defects sửa trong phạm vi này:

- Phân biệt câu hỏi “Quy định phân bổ tủ đồ…” với lệnh phân bổ; câu policy chung không bị coi là tên nhân viên.
- Câu cỡ trần `XL` sau chủ đề mới hỏi lại context và không gọi paid model để đoán.
- Truy xuất archive `...-V2`/`...-v2`, metadata và PO/receipts chấp nhận casing khác nhưng giữ physical IDs/version/citations gốc, vẫn kiểm quyền.
- Đồng bộ assertion legacy source URL với điều hướng SKU/kho hiện hành.
- Thêm evaluator có attribution rõ, opt-in smoke giới hạn, reusable secret scan và tests HTTP/current-state/misuse. Không đổi command rules, module workflows, seed hoặc `.env` values.

## Gate còn lại và kết luận

1. **Browser:** chạy `npm run test:qa` trên host cho mở localhost và có Chromium; phải thực thi đủ 68 journeys, đọc browser-health và xem ảnh desktop/mobile trước chốt UI.
2. **Semantic:** provision runtime + pinned E5 artifacts theo hướng dẫn 6.3; `rag:check` phải ready; chạy lại cùng 30 câu và báo hybrid/paraphrase metrics thực. Không chỉ đổi badge.
3. **Live AI:** từ host có DNS/egress, chạy đúng opt-in smoke **một lần**, xác nhận tool/record/numbers/model/usage. Sau đó rehearsal 5 kịch bản bằng synthetic data, human-review grounded claims/abstention. Không chạy toàn regression suite qua paid API.
4. **Secrets/Git:** khi có repository hoạt động, kiểm index/history không xuất key. Những kiểm tra hiện có chỉ xác nhận working files/bundles/artifacts đã quét.

**Mức sẵn sàng:** đạt nền logic/API/component/build cho prototype synthetic và có [năm kịch bản lặp lại](ai-demo-guide.md). **Chưa demo-ready cho buổi live AI/semantic RAG đã hứa**, chưa có bằng chứng browser hoặc live inference. Có thể diễn tập phương án deterministic/BM25 có ghi nhãn trên máy chạy browser được; không trình bày phương án đó như semantic/live LLM thành công.
