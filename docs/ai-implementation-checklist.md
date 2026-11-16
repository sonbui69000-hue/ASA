# Kế hoạch triển khai và nghiệm thu AI — Phase 6.1

> Hiện trạng Phase 6.3: pipeline RAG đã được bổ sung; xem [triển khai](ai-rag-implementation.md) và [đánh giá](ai-rag-evaluation.md). Local E5 chưa provision được trong môi trường thực thi nên runtime hiện dùng BM25, không tuyên bố semantic đã hoạt động. Các mô tả phase cũ dưới đây là lịch sử.

> Cập nhật Phase 6.2: đã triển khai backend/tools theo [ai-openrouter-implementation.md](ai-openrouter-implementation.md). Tài liệu này giữ thiết kế tại Phase 6.1; trạng thái triển khai và khác biệt thực tế nằm trong báo cáo mới. Phase 6.3/semantic RAG chưa triển khai.

Ngày lập: 10/11/2026. **Phase 6.1 chỉ bàn giao tài liệu.** Mọi ô triển khai bên dưới chưa đánh dấu là công việc tương lai, không phải quyền bắt đầu Phase 6.2. Liên kết: [kiến trúc](ai-integration-plan.md), [tool registry](ai-tool-registry.md), [RAG](ai-rag-design.md), [quyền/an toàn](ai-security-design.md).

## 1. Việc đã thực hiện trong Phase 6.1

- [x] Đọc AGENTS, proposal gốc ở `proposal.md`, prompt thực tế `prompts/61.md`, requirements/architecture/data-model, báo cáo Excel và demo.
- [x] Kiểm tra mã assistant/router/retrieval, bốn module, commands/selectors/models/schema, seed SAP mô phỏng, DemoStore/migration/localStorage và UI context/history.
- [x] Kiểm tra package/scripts, cấu hình Vite/TypeScript/Vitest/Playwright, test logic/component và các hành trình E2E hiện có.
- [x] Kiểm tra `.env` theo tên biến và sự hiện diện, không in/copy key; giữ `OPENROUTER_API_KEY` và `OPENROUTER_MODEL` đúng tên.
- [x] Khảo sát tài liệu/metadata công khai OpenRouter, model đang cấu hình và local embedding. Không gọi inference hoặc API có Authorization.
- [x] Tạo đủ năm tài liệu Phase 6.1, phân biệt hiện có/đề xuất/chưa xác minh.
- [x] Bổ sung ignore `.env`/`.env.*`, ngoại lệ `.env.example`; không sửa nội dung `.env`.
- [x] Chạy lại Vitest/RTL và TypeScript hiện hành; thử preview để kiểm điều kiện browser. Kết quả thật ở phần 2.

Không sửa application code, prompt, proposal, package/lockfile, cấu hình build/test hoặc AGENTS; không cài package/browser/model, không tạo backend/credential và không tiến hành Phase 6.2. Thay đổi ngoài năm tài liệu chỉ là `.gitignore` để đáp ứng yêu cầu tránh đưa `.env` vào Git.

## 2. Bằng chứng kiểm tra hiện tại

| Kiểm tra đã thực thi trong lượt Phase 6.1                                                  | Kết quả                                                                                                                                |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `./node_modules/.bin/vitest run --reporter=json --outputFile=/tmp/asa-phase61-vitest.json` | **155 passed, 0 failed, 0 pending**, 16 tệp test; exit 0. Đây là logic/RTL hiện hành, không kiểm backend/RAG chưa viết.                |
| `npm run typecheck`                                                                        | **Qua**, exit 0. Không sửa code để đạt kết quả này.                                                                                    |
| `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`                             | **Bị chặn**, exit 1, `listen EPERM 127.0.0.1:4173`.                                                                                    |
| Browser workflow/screenshot trong Phase 6.1                                                | **Chưa thực thi/xác minh** do preview không mở cổng. Không chạy lại suite Playwright sau khi xác định chặn server; không nói E2E pass. |
| OpenRouter tool calling / structured output live                                           | **Chưa thực thi**; chỉ đọc metadata/tài liệu public, không xác minh key, credit hoặc provider route.                                   |
| Local embedding/semantic retrieval/latency/RSS                                             | **Chưa thực thi**; chưa cài runtime hoặc tải trọng số.                                                                                 |
| Production build                                                                           | Không chạy lại trong phase tài liệu; không lấy build cũ trong `dist/` làm bằng chứng mới.                                              |

`/tmp/asa-phase61-vitest.json` là artifact tạm của lần chạy, không là dữ liệu ứng dụng hoặc artifact được commit. Báo cáo [demo-verification.md](demo-verification.md) ghi 48 E2E đã đăng ký và bị chặn ở phase trước; đó là kết quả lịch sử, không kết quả chạy mới. Cấu hình hiện có dùng một worker, không retry, preview thật 4173, locale vi-VN/timezone Asia/Bangkok, desktop Chrome 1440×1000 và Pixel 7 Chromium. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` là tùy chọn browser hiện hữu, không thay tên biến OpenRouter.

Kiểm tra bàn giao tài liệu: Prettier trên cả năm file; link cục bộ tồn tại và code fence cân bằng; không có giá trị API key trong tài liệu. Đối chiếu SHA-256 của **81 file nguồn/test/config/prompt/proposal ban đầu** không thấy thay đổi; package/lockfile giữ nguyên. Quy tắc ignore đã được kiểm bằng một Git repository tạm trong `/tmp`: `.env`, `.env.local`, `.env.production` bị ignore, `.env.example` không bị ignore. Đây là kiểm quy tắc, không xác minh tracked/history của thư mục dự án hiện không được Git nhận là working tree.

## 3. Các quyết định cần xác nhận trước triển khai

Các câu hỏi này không chặn việc bàn giao tài liệu và không yêu cầu xác nhận ngay trong Phase 6.1.

| ID  | Đề xuất mặc định                                                                                               | Điều cần người phụ trách chốt                                                                                                                             |
| --- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Node giữ một State chuẩn + JSON local; online localStorage chỉ cache đã lọc; offline cũ tách biệt              | Chấp nhận đổi authority/persistence boundary và chi phí refactor cả bốn module; không chọn bridge rồi gọi đó là secure                                    |
| D2  | Credential demo riêng/account, session HttpOnly, operator cấp và giữ credential                                | Cách trình diễn đổi vai trò có xác thực; có cần nhiều người/thiết bị hay chỉ một operator local? Nhiều thiết bị là phạm vi bổ sung                        |
| D3  | Preserve dataset hiện tại qua operator import một lần có kiểm tra, hoặc chọn seed mới có chủ ý                 | Workspace nào làm nguồn đầu, quy trình backup/rollback; không tự reset hoặc merge localStorage vào backend                                                |
| D4  | Giữ policy demo hiện có nhưng thêm field/line projection; lịch sử chuyển khoa như security design              | Danh sách grants kho/giá/role rộng, scope lịch sử và có cần thu hẹp `isWide`/ACL khoa trước live demo                                                     |
| D5  | Dùng đúng model từ `OPENROUTER_MODEL`; không silent fallback model; route yêu cầu capability và policy dữ liệu | Cho phép gọi OpenRouter với dữ liệu synthetic trong phase triển khai, cập nhật ràng buộc AGENTS tương ứng; chấp nhận chính sách provider thực tế          |
| D6  | Local E5 nhỏ ONNX/Transformers.js, provision một lần rồi offline embedding                                     | Cho phép dependency và tải artifact ở phase triển khai; máy đích có RAM/disk/native runtime phù hợp; nếu không, chấp nhận keyword mode còn thiếu semantic |
| D7  | Ngân sách đề xuất 0,03 USD/lượt, 5 USD/ngày; usage metadata tối đa 7 ngày                                      | Trần chi phí/retention/chủ sở hữu tài khoản OpenRouter và cách đối soát request timeout                                                                   |

Không yêu cầu API key mới, không ghi một model chat mặc định vào code. Nếu model hiện tại không đáp ứng capability, trình bày lựa chọn fallback cùng model/deterministic hoặc người vận hành chủ ý đổi `OPENROUTER_MODEL`; không tự đổi.

## 4. Trình tự năm tuần đề xuất

Mục tiêu là prototype một workspace trên máy cục bộ, không triển khai hạ tầng enterprise. Mốc nào chưa đạt gate thì giữ offline deterministic; không bỏ gate quyền để “kịp bật AI”.

### Tuần 1 — State service, session và hợp đồng dữ liệu

- [ ] Chốt D1–D5 và ràng buộc OpenRouter; lưu thay đổi yêu cầu/AGENTS khi được phép triển khai.
- [ ] Tạo Node entry/config; chỉ server đọc hai biến OpenRouter, API key không vào response/log/client.
- [ ] Xây StateRepository một process, migration/schema/invariant, workspace epoch, serialize write queue, atomic file commit và recovery không reseed.
- [ ] Runtime schema strict cho từng command; session/Origin/CSRF/body-limit/rate-limit trước mọi command/query.
- [ ] Server-owned account/credential/session; không nâng quyền bằng account picker/localStorage. Reset/import được kiểm server, có xác nhận.
- [ ] Idempotency gắn principal+payload hash+operationId; revision conflict, file lỗi và replay có kết quả rõ, không double stock/audit.
- [ ] Thiết kế DTO và read facade theo module; tính trên State đầy đủ, project sau. Không endpoint full state.
- [ ] Nếu chuyển JSON demo cũ: operator xác nhận synthetic, validate/migrate/diff/backup/import; giữ IDs/giá/ledger/ACL theo quyết định D3.

**Gate 1:** hai phiên khác nhau không giả principal; client không sửa trực tiếp State/ACL; atomicity/restart/recovery/revision và phép tính hiện có chạy qua máy chủ. Nếu gate không qua, chưa gọi OpenRouter.

### Tuần 2 — Kết nối bốn module với một nguồn chuẩn

- [ ] Remote store/view adapter, async `act`, busy/retry/error đúng tiếng Việt; mọi callback trả/await Promise, toast/đóng form sau commit.
- [ ] Di chuyển lần lượt đồng phục → mua sắm → tài liệu → tủ đồ; shell/dashboard/hộp duyệt/audit/settings/demo dùng cùng read facade.
- [ ] Giữ quota/commit/reserve/FIFO/giá lịch sử/ngoại lệ, PR→duyệt→PO mô phỏng→nhận kho, chuyển/trả tủ, che/rà soát/publish/ACL/ký/version.
- [ ] Dùng origin/namespace online riêng; localStorage cache theo principal/workspace/policy, không lưu full State/document text/secret.
- [ ] Reload/focus/tab khác kiểm ref; mất backend khóa ghi và báo chưa cập nhật, không fallback sang ghi localStorage riêng.
- [ ] Hoàn thiện tool adapters chỉ đọc và evidence ledger. Deterministic fallback online dùng State chuẩn và cùng policy/projection, không gọi selector không scope trực tiếp.
- [ ] Test trường hợp request nhóm/PR nhiều khoa/historical locker, chặn cả field và tổng dữ liệu ngoài quyền.

**Gate 2:** các workflow cũ giữ kết quả nghiệp vụ trên state máy chủ; UI, dashboard, tool và fallback thấy cùng revision sau commit; reset/migration không mất dữ liệu ngầm.

### Tuần 3 — OpenRouter và hội thoại có kiểm chứng

- [ ] Public metadata/capability preflight theo `OPENROUTER_MODEL`, TTL rõ; không tốn inference để tự đoán model khác.
- [ ] Native fetch adapter, timeout/AbortController/cancellation, parse response và usage runtime schema, error mapping; provider parameters/data policy đúng.
- [ ] Bounded tool loop; giữ tool_call_id/history protocol, call count/token/deadline/concurrency/budget cap; không tool ghi.
- [ ] Response claims + evidence IDs, fact validation, route allowlist; cấm assertion đã ghi nghiệp vụ.
- [ ] UI phân biệt `llm`, `deterministic`, retrieval mode và lý do degraded bằng tiếng Việt; retry/cancel/clear/source đều có tác dụng.
- [ ] Giữ tối đa 30 câu hỏi/context IDs theo phiên, câu hỏi ≤500 ký tự. Không tự gọi LLM lại cả history trên render hoặc mỗi revision.
- [ ] Đổi account/ACL/reset/ref hủy lượt, ẩn answer cũ và không nhận response trễ. Chỉ người dùng chủ ý “Tra cứu lại” mới phát lượt LLM mới.
- [ ] Usage ledger bền qua restart, cost unknown/reservation đối soát, log allowlist không key/prompt/passage.

**Gate 3:** fake transport kiểm được mọi nhánh lỗi và tool protocol; live smoke chỉ chạy khi được phép dùng API, đúng model môi trường và ngân sách, toàn dữ liệu synthetic. Không gọi live API trong CI mặc định.

### Tuần 4 — RAG hybrid thực tế

- [ ] Chốt D6; chọn version dependency và model artifact/revision/checksum/license, provision có chủ ý và đo khả năng chạy trên máy đích.
- [ ] Chunk section/paragraph theo tokenizer, exact source offset/hash; lineage ID archive đúng command hiện có.
- [ ] Lọc ACL/publication/date trước ranking và mỗi lần đọc; không original/draft trong context.
- [ ] BM25 + local embedding 384 chiều + exact cosine + RRF, metadata manifest và explicit keyword degraded mode.
- [ ] Publish/revoke/version/ACL/date/reset invalidation, atomic index generation; chỉ re-embed content thay đổi.
- [ ] Citation ledger và reader kiểm lại version/section/span/hash/quyền; không href/title do model tự chế.
- [ ] Bộ ground truth tiếng Việt: paraphrase, không dấu, ID, câu hỏi thiếu nguồn/ngoài quyền; đo recall/citation/abstention/latency/RAM.

**Gate 4:** vector/query encoder thật chạy được với đúng artifact, hybrid đánh giá tốt hơn hoặc có lợi rõ so keyword trên paraphrase, không có rò quyền, citation exact. Nếu thiếu model/runtime thì báo semantic chưa hoàn thành; không đổi nhãn để pass.

### Tuần 5 — Regression, browser và chuẩn bị demo

- [ ] Chạy Vitest/RTL, TypeScript/build và toàn bộ Playwright trong môi trường cho phép HTTP cục bộ/Chromium; kiểm log thực thi từng case, không chỉ discovery.
- [ ] Chạy năm kịch bản demo liên tục trên một workspace: cấp nhóm, thiếu→PR, hỏi hợp đồng có nguồn, phân bổ tủ nhóm, mapping NCC có xác nhận.
- [ ] Chạy biến thể thiếu nữ XXL→PR→PO→nhận→cấp→chat; kiểm giá lịch sử và state sau restart/reload/đổi phiên.
- [ ] Chạy outage/rate-limit/timeout/malformed tool/injection/revoke giữa lượt; kiểm fallback cùng số liệu mới và không ghi từ chat.
- [ ] Chụp desktop/mobile, focus/keyboard/loading/clear/retry/citation, không tràn ngang; dùng Playwright skill và UI/UX Pro Max khi thực hiện rà soát giao diện.
- [ ] Kiểm bundle/static routes/logs/artifacts không có key/raw state/original; cập nhật README/demo/limitations theo hành vi thực sự đã chạy.
- [ ] Diễn tập warm/cold model, khởi động lại server, budget hết và fallback; chốt rõ phần nào qua/chưa qua/bị chặn.

**Gate 5:** có kết quả workflow browser thật, artifact ảnh/trace tổng hợp và báo cáo trung thực. Chặn môi trường vẫn là “chưa xác minh”, không được coi unit pass là browser pass.

## 5. Các thay đổi mã dự kiến — chưa thực hiện

| File/khu vực                                                                                               | Thay đổi cần làm trong phase triển khai                                                                                                              |
| ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/index.ts`, `server/config.ts` (mới)                                                                | HTTP routes, static dist allowlist, env validation, lifecycle/status                                                                                 |
| `server/state/*` (mới)                                                                                     | File repository/envelope, write queue, epoch/revision, idempotency, import/reset/operator tooling                                                    |
| `server/auth/*`, `server/policy/*` (mới)                                                                   | Credential demo, session, Origin/CSRF/rate limit, policy object/field/row, view DTO                                                                  |
| `server/ai/*` (mới)                                                                                        | OpenRouter transport/orchestrator, tool registry/adapters/schema, evidence/fact validator, fallback, cost/safe log                                   |
| `server/rag/*` (mới)                                                                                       | Eligibility/lineage/chunker/BM25/embedding/cosine/RRF/index/citation lifecycle                                                                       |
| `src/domain/{types,schema,commands,selectors,assistant*,uniform-attributes,product-search}.ts`             | Tái sử dụng logic; thêm runtime command contract/pure policy ở vị trí hợp lý, giữ offline. Không import server/secret/runtime embedding vào frontend |
| `src/store/store.ts`, `src/app/context.tsx`, `src/main.tsx`                                                | Giữ local demo adapter; thêm online view store/client async với mode rõ, không hai nguồn ghi                                                         |
| `src/features/{uniforms,purchases,documents,lockers,dashboard,work,demo,assistant}.tsx`, `src/app/App.tsx` | Đọc read facade/DTO, awaiting command, session switch, freshness/source/fallback UI; cập nhật tất cả chỗ đọc `s.*`, không chỉ drawer AI              |
| `src/components/shared.tsx`                                                                                | Giữ form/confirmation await/busy/error; kiểm callback caller không làm Promise bị bỏ qua                                                             |
| `vite.config.ts`, `package.json`, TypeScript/server config                                                 | Proxy online origin, backend scripts/typecheck và runtime tách biệt; hiện `tsconfig` chưa include server                                             |
| `playwright.config.ts`, `tests/e2e/fixtures.ts`, `scripts/qa.mjs`                                          | Giữ offline suite; thêm project online với Node+Vite hoặc server dist, test fixture server isolated; QA report phân biệt mode/blocked/notExecuted    |
| `docs/requirements.md`, `architecture.md`, `data-model.md`, `assistant.md`, README/limitations             | Đồng bộ sau khi implementation thật, không ghi thiết kế tương lai như đã hoàn tất                                                                    |

`Modal` hiện hỗ trợ Promise nhưng nhiều feature callback đang gọi `act` đồng bộ. Các selector UI hiện phụ thuộc collection đầy đủ; không đưa DTO thiếu collection vào `assertState/execute` hoặc dùng nó để tính lại stock. Đây là phần chuyển đổi chính, không phải chỉ thêm `/api/chat`.

## 6. Dependency và hạ tầng dự kiến

| Thành phần                       | Quyết định                                                                                                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node built-ins                   | HTTP/fetch/AbortController/crypto/fs/worker; không cần HTTP SDK OpenRouter, dotenv, Redis hoặc database server                                                                                                              |
| `zod`                            | Đã có, tái sử dụng input/output/state validation                                                                                                                                                                            |
| `tsx`                            | Dependency launcher TypeScript dự kiến cho backend cục bộ dùng ESM/import hiện tại; pin bản tương thích khi triển khai. Nếu chọn compile riêng phải giải quyết import resolution thay vì giả định tsconfig Vite đủ cho Node |
| `@huggingface/transformers`      | Dependency mới cho local embedding, chỉ server; native ONNX/transitive dependencies và Node compatibility cần kiểm                                                                                                          |
| E5 ONNX/tokenizer artifacts      | Download riêng có checksum/revision; không bundle client, không tải lúc người dùng hỏi                                                                                                                                      |
| Vitest/RTL/Playwright/TypeScript | Đã có, không thêm framework test/supertest chỉ để kiểm API; dùng handler/factory testable và HTTP thật ở môi trường cho phép                                                                                                |
| Hạ tầng                          | Một process/JSON workspace local, thư mục usage/index/credentials ngoài web root; không Docker/PostgreSQL/Redis/cloud mới                                                                                                   |

Không cài bất kỳ mục nào trong Phase 6.1. Package manager/lockfile hiện được giữ nguyên; không dùng `npx` để tải package thiếu dưới danh nghĩa kiểm thử.

## 7. Ma trận lỗi và fallback bắt buộc

Fallback **online** phải đọc State chuẩn trên server và cùng quyền/projection như tools. Có thể tái sử dụng `interpret`, cấu trúc/template của `answerQuery` và retrieval xác định sau lớp kiểm quyền; không gọi nguyên một nhánh không scope rồi mặc định tin output. Fallback không được nới ACL/budget hoặc đọc một bản localStorage khác. Backend hoàn toàn không truy cập được thì báo chưa thể đối chiếu; chỉ chuyển sang offline demo tách biệt bằng lựa chọn rõ của operator.

| Tình huống                                        | Hành vi / phản hồi tiếng Việt dự kiến                                                  | Retry/fallback                                                                                                                                          |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Thiếu key hoặc model rỗng                         | “AI chưa được cấu hình; đang dùng trợ lý xác định.” Status chỉ nêu missing field name  | Không request upstream; không yêu cầu khóa khác                                                                                                         |
| Key không hợp lệ/401/403                          | “Kết nối AI chưa khả dụng; vui lòng liên hệ người vận hành demo.” Không hiện raw error | Tắt LLM cho đến revalidate, deterministic có quyền                                                                                                      |
| Model không tồn tại/capability không hỗ trợ       | “Model cấu hình chưa đáp ứng chức năng này.”                                           | Không đổi model; deterministic routing/synthesis fallback như integration plan                                                                          |
| Credit hết/402 hoặc budget ứng dụng hết           | “Đã tạm dừng AI theo giới hạn sử dụng; tiếp tục tra cứu xác định.”                     | Không retry trả phí hoặc tìm model khác                                                                                                                 |
| OpenRouter outage/5xx/network                     | “Dịch vụ AI đang gián đoạn; kết quả dưới đây được tra cứu bằng quy tắc.”               | Bản đầu không tự retry completion; circuit breaker đề xuất sau 3 lỗi availability trong 60 giây, nghỉ 60 giây; người dùng có thể thử lại có kiểm budget |
| Timeout/deadline/cancel                           | “AI chưa phản hồi kịp; đang đối chiếu nguồn hiện tại bằng quy tắc.”                    | Abort provider; fallback nếu session/ref còn hợp lệ; chi phí có thể chưa biết                                                                           |
| Rate limit/429                                    | “AI đang giới hạn lượt; có thể dùng tra cứu xác định và thử lại sau.”                  | Tôn trọng Retry-After, không tự chạy vòng retry; circuit/rate state không đổi model                                                                     |
| Tool name/JSON/arguments sai                      | Chặn resolver; error code chuẩn không lộ schema/stack nhạy cảm                         | Tối đa một repair nếu còn completion/deadline/budget; sau đó deterministic                                                                              |
| Cùng tên nhiều nhân viên                          | “Có nhiều nhân viên phù hợp; vui lòng chọn mã.”                                        | Chỉ ứng viên được phép, không đoán/đổi sang self                                                                                                        |
| Thiếu mã/biến thể/kho                             | “Vui lòng bổ sung mã, cỡ hoặc kho cần tra.”                                            | Hỏi rõ hoặc nêu mặc định hiện có minh bạch, không chọn biến thể tùy ý                                                                                   |
| SKU thiếu hoặc không được phép                    | “Không có bản ghi trong phạm vi tra cứu.”                                              | Không bịa mã/thay cỡ. SKU thật có tồn 0 trả 0, không unavailable                                                                                        |
| Tài liệu trái quyền/không tồn tại/thu hồi/hết hạn | “Chưa đủ tài liệu còn hiệu lực trong phạm vi được phép.”                               | Không title/snippet/existence leak; không thử role khác                                                                                                 |
| Passage không đủ kết luận/citation lỗi            | “Chưa đủ bằng chứng để kết luận.” Có thể hiện trích đoạn hỗ trợ phần đã biết           | Không đoán chính sách; template/extractive nếu an toàn                                                                                                  |
| Injection trong tài liệu                          | Bỏ chỉ dẫn điều khiển, chỉ dùng nội dung như nguồn nếu phù hợp                         | Không URL/tool ghi/key; nếu validation thất bại dùng deterministic                                                                                      |
| State/ACL/account đổi giữa lượt                   | “Dữ liệu hoặc quyền đã thay đổi; vui lòng tra cứu lại.”                                | Không show response cũ. Fallback đọc mới nếu an toàn, không tự phát thêm vòng LLM                                                                       |
| Cache/embedding lỗi hoặc model chưa provision     | “Đang tìm theo từ khóa; truy xuất ngữ nghĩa chưa khả dụng.”                            | Keyword có nguồn, không gắn nhãn hybrid                                                                                                                 |
| Backend/persistence lỗi                           | “Chưa thể đối chiếu/lưu dữ liệu. Vui lòng thử lại khi kết nối sẵn sàng.”               | Không ghi browser riêng hoặc báo commit thành công                                                                                                      |

Parse cả HTTP status và error JSON: response HTTP thành công vẫn có thể chứa provider error. Lỗi transport/provider chuẩn hóa theo [OpenRouter error handling](https://openrouter.ai/docs/api_reference/errors-and-debugging), không hiển thị raw `message/metadata`. Cơ chế retry/circuit breaker là đề xuất ứng dụng, không giả định provider không tự retry hoặc request lỗi không mất phí.

## 8. Chiến lược kiểm thử

### Vitest logic và server

- [ ] Giữ 155 test hiện có và bổ sung các test nghiệp vụ bị ảnh hưởng thực sự: không đổi công thức/giá/định mức/luồng/migration. Không snapshot lời văn LLM để kiểm tính xác định.
- [ ] Unit tool contracts: từng schema âm, unknown key/tool, JSON quá lớn, size alias, ID/code phân biệt, ambiguity, field scope, unauthorized và no-mutation.
- [ ] Node test environment riêng cho state/auth/API, không để server tests dùng mặc định jsdom. Kiểm temp-file failure/rename/restart, concurrent commands, revision conflict, operation replay/hash/principal, reset epoch và corrupt file.
- [ ] Auth/permission: thiếu/sai credential, forged role/account/cookie/snapshot, account inactive/chuyển khoa, direct ID, request nhóm, PR nhiều khoa, tủ trả/history và document original không đi vào DTO/prompt.
- [ ] OpenRouter transport fake trong dependency injection chỉ của test factory: success, tool loop, no tools, wrong schema, truncation, empty choices, errors kể cả HTTP 200, 401/402/429/5xx, timeout/abort/budget/usage unknown. Không có fake transport endpoint bật từ browser.
- [ ] RAG: tokenizer/source offsets/hash, chunk budget, embedding dimension/normalization/model mismatch, permitted candidate set trước ranking, Unicode/Vietnamese paraphrase, keyword degraded, lineage/version/date/ACL/revoke/reset.
- [ ] Response validation: forged citation, claim số sai, không nguồn, lệnh ghi giả, injection, late response khi đổi phiên và safe logs; key giả trong test không được xuất hiện trong bundle/log/report.

### React Testing Library

- [ ] Async confirmation: hủy không ghi; pending không double submit; commit failure không đóng/toast thành công; conflict yêu cầu tải lại.
- [ ] Chat: loading/cancel/retry/clear, labels llm/deterministic/keyword/hybrid, source focus, hỏi rõ, đổi phiên, ref đổi và không gọi lại 30 lượt trên render.
- [ ] Client chỉ có DTO đúng scope; click citation kiểm lại, mất quyền thì xóa snippet đang hiện. Không dùng browser cache làm nguồn thật trong online mode.

### Playwright trên ứng dụng chạy thật

- [ ] Giữ suite offline cho regression localStorage/migration; online dùng server workspace tạm và credentials synthetic được provision trước browser khởi chạy. Không seed bằng DevTools giữa hành trình để tạo kết quả.
- [ ] Test fixture hiện dùng `page.addInitScript`/localStorage, helper `state(page)` và role picker: chúng không chứng minh quyền server. Online phải dùng fixture server độc lập, login thật và endpoint/read-only inspection chỉ trong test process hoặc operator harness.
- [ ] Backend/API/rules/RAG chạy thật; chỉ giả provider transport ở ranh giới OpenRouter cho CI ổn định, không `route.fulfill` giả toàn ứng dụng. Live smoke có ngân sách là nhóm riêng có chủ ý.
- [ ] Hành trình: điều chỉnh/nhận/cấp hàng rồi chat thấy ref mới, hoàn tất PR/PO, tủ cấp/chuyển/trả, tài liệu che→review→publish→citation→ACL/revoke, hai account song song không rò câu trả lời.
- [ ] Kiểm request browser không chứa key/role/snapshot thô, direct unauthorized API bị chặn, offline cache không được ghi thay server khi mạng lỗi.
- [ ] Health fixture hiện fail mọi HTTP≥400; với test negative có chủ ý, chỉ whitelist đúng request/status đã assert, không bỏ kiểm console/network toàn suite.
- [ ] Desktop/mobile, keyboard/focus, không overflow, screenshots và traces chỉ khi đã thực thi. Phân biệt discovery, passed, failed, blocked và notExecuted trong QA report.

Các lệnh `npm run test`, `npm run typecheck`, `npm run build`, `npm run test:e2e`, `npm run test:qa` là baseline hiện có; sau khi có backend phải mở rộng scripts/config có chủ ý để bao gồm server typecheck/tests/startup. Không cho rằng lệnh TypeScript hiện nay đã kiểm server chưa tồn tại.

## 9. Bàn giao và rollback trong tương lai

Hoàn tất triển khai chỉ khi source/secret scan, logic tests, server contracts, RAG evaluation và workflow Playwright thực sự chạy đạt các gate. LLM wording có thể biến thiên; dữ liệu/quyền/số liệu/citation/no-write phải ổn định và kiểm được. Nếu sandbox vẫn chặn server/browser, ghi rõ phần chưa thực thi và chạy lại trên máy demo trước chốt.

Rollback AI: tắt LLM ở server, giữ authoritative State và deterministic tools có cùng quyền; không rollback dataset về seed hoặc browser cache. Rollback toàn chế độ online là lựa chọn operator riêng, có backup/export và thông báo không tự merge dữ liệu offline. Không tự thay file JSON chuẩn bằng cache sau lỗi.

Phase 6.1 kết thúc tại bộ tài liệu này. Các checkbox triển khai và quyết định chưa xác nhận được giữ mở; không chạy bước của Phase 6.2 chỉ để thử kế hoạch.
