# Triển khai Document RAG — Phase 6.3

> Hiện trạng Phase 6.4: đã cải tiến UX/context/clarification và điều hướng nguồn. Xem [ai-ux-verification.md](ai-ux-verification.md) để biết kết quả 300 tests, các giới hạn browser/semantic và trạng thái mới nhất. Mô tả phase trước dưới đây được giữ làm lịch sử.

Ngày: 10/11/2026. Phạm vi: [prompts/63.md](../prompts/63.md), tiếp nối [Phase 6.2](ai-openrouter-implementation.md) và [thiết kế Phase 6.1](ai-rag-design.md). Không thực hiện Phase 6.4.

## Trạng thái thực tế

Đã triển khai ingestion/chunk, local neural encoder adapter, index RAM có kiểm phiên bản, BM25/cosine/RRF, ACL trước ranking, OpenRouter generation có schema, kiểm citation và reader đánh dấu nguồn. Các workflow nhập → che thông tin → rà soát → publish → tạo phiên bản → thu hồi → ký xác nhận được giữ qua domain command hiện có. Không đổi quota, tồn kho, PO, nhận hàng hay phân bổ tủ.

**Semantic chưa hoạt động trên máy thực thi này.** Chưa có package `@huggingface/transformers` hoặc trọng số E5 trong cache. Kiểm registry bằng `npm view` bị `EAI_AGAIN` (DNS/network); chưa cài runtime hoặc tải trọng số. `npm run rag:check` đã thực thi và báo `semantic_unavailable`, exit 1. Không tạo vector giả, hash embedding, synonym map hay gọi keyword-only là semantic. Có code path neural embedding thật; kiểm thử encoder/vector dùng fixture không chứng minh inference E5 hoặc chất lượng semantic thực tế. Gate vận hành hybrid còn thiếu local inference và đánh giá trên máy provision được model.

Ứng dụng vẫn tìm bằng BM25 có nguồn và hiển thị “Mô hình ngữ nghĩa chưa khả dụng”. Generation có thể dùng OpenRouter với nguồn BM25; đó là RAG từ khóa, không phải semantic/hybrid đã được xác minh. Chưa chạy paid/live inference trong lượt triển khai này.

## Chạy và cấu hình

```bash
npm run build
npm run server
# Mở http://127.0.0.1:8080
```

Backend tiếp tục dùng `.env` gốc qua `node --env-file-if-exists=.env`. Generation chỉ đọc đúng **OPENROUTER_API_KEY** và **OPENROUTER_MODEL**, không hardcode model và không dùng chat model làm embedding. Key chỉ ở Authorization header Node → OpenRouter; không đưa vào browser, response, prompt hay logs. Không sửa `.env` hoặc yêu cầu key mới.

Để bật neural retrieval trên máy có mạng/dung lượng phù hợp:

```bash
# Dependency inference tùy chọn; không cần cho build/test/fallback hiện hành
npm install --no-save --package-lock=false @huggingface/transformers@3.8.1

# Chọn commit SHA 40 ký tự từ repository model, không dùng main không khóa
npm run rag:provision -- --revision <commit-SHA-40-ky-tu>
npm run rag:check
npm run rag:evaluate
# Khởi động lại server sau khi provision/đổi model
npm run server
```

Model cố định được adapter hỗ trợ là `Xenova/multilingual-e5-small`, 384 chiều, q8. Revision phải được operator chọn từ [model repository](https://huggingface.co/Xenova/multilingual-e5-small/tree/main), xem [model card nguồn và license MIT](https://huggingface.co/intfloat/multilingual-e5-small). Có thể đặt **RAG_EMBEDDING_DIR** (không phải secret) sang thư mục artifact khác; mặc định `.local/rag/model`. Không cần embedding API key/model bên ngoài. Adapter chỉ chấp nhận manifest tương thích E5; đổi directory/revision cần restart, đổi encoder family cần implementation/đánh giá mới.

Provisioning tải config/tokenizer và duy nhất `onnx/model_quantized.onnx` từ URL revision đã khóa, ghi SHA-256 từng artifact vào manifest, giới hạn dung lượng/timeout và không ghi đè bộ model đang có. Đây là bước tải artifact công khai, không phải dịch vụ embedding; không gửi câu hỏi hoặc tài liệu trong bước tải. Quyền riêng tư: embedding chạy local; generation vẫn gửi câu hỏi và evidence tối thiểu được phép tới OpenRouter/upstream, với policy `data_collection=deny` kế thừa Phase 6.2. Không có phí embedding API; vẫn có chi phí CPU/RAM/disk/download và phí chat theo model cấu hình. Chưa đo disk/RSS/latency model thực tế.

Runtime xác minh manifest/revision/hash, vô hiệu remote models, dùng `local_files_only`, prefix `query:`/`passage:`, mean pooling và L2 normalization. Kiểm tokenizer thật không vượt 512 token, không âm thầm truncate. [Tài liệu local model](https://huggingface.co/docs/transformers.js/api/env) và [Node inference](https://huggingface.co/docs/transformers.js/tutorials/node). Kết quả smoke-check phải là `ready` trước khi mô tả demo là hybrid.

## Ingestion và chunk

Nguồn duy nhất là `StateRepository.snapshot().documents` của mọi module online. Không tạo corpus AI riêng, không sửa seed. Offline/localStorage vẫn dùng retrieval xác định cũ và được ghi nhãn từ khóa.

Chỉ các bản `published`, `date <= settings.date <= expires` được ingest. Không lấy draft, reviewed chưa publish, revoked, superseded, expired hoặc future-effective. Chỉ title/sections đã rà soát; không index `original`, signatures, audit notes hay tên file gốc. Dữ liệu đầu vào vẫn TXT/Markdown tối đa 200 KB, mẫu DOCX mô phỏng; chưa OCR/PDF/DOCX extraction thật.

Chunk giữ một section; dùng `Intl.Segmenter("vi", sentence)` và paragraph/newline, rồi ranh giới từ cho câu quá dài. Giới hạn 1.000 UTF-8 byte/chunk, overlap nguyên sentence/atom tối đa 160 byte; không cắt surrogate pair và không ghép hai section. Khác với dự kiến token-target Phase 6.1: byte cap là quy tắc chunk độc lập runtime, không được gọi là số token. Encoder kiểm 512 token gồm title/prefix; nếu vượt hoặc inference lỗi thì search dùng BM25 với nhãn degraded. Các mục/đoạn đặc biệt dài có thể mất kênh semantic; cần đo trên corpus mới.

Metadata dẫn xuất gồm physical record ID, document root lineage, title, category/type, department, version, effective/expiration dates, section ID/title, UTF-16 start/end, exact text, SHA-256 content, publication fingerprint và ACL fingerprint. Trạng thái published/ngày/quyền gốc luôn được kiểm từ State, không tin cache. Chunk ID gồm chunker version, physical record/version/section, offsets/hash. Điều kiện kiểm chứng: `passage === section.text.slice(sourceStart, sourceEnd)`.

Lineage được suy từ archive đúng pattern do command tạo và base có version lớn hơn; không ép migrate IDs. Khi base là draft v3, archive physical `...-v2` vẫn phục vụ v2. Publish v3 làm archive superseded và thay nguồn. Nếu lineage có hai publication đang hợp lệ thì loại cả lineage thay vì chọn ngẫu nhiên.

## Truy xuất và index

1. Xác thực principal từ session server, account/employee còn active; lấy snapshot/ref nhất quán.
2. Ingest eligible publications vào generation dẫn xuất. Lọc role ACL, publication/version/ngày và metadata **trước scoring**. `departmentId` chỉ là metadata filter, không tự biến thành ACL khoa. Sysadmin không vượt document readRoles.
3. BM25 trên chính tập chunk được phép: Unicode fold tiếng Việt/không dấu, stop words, mã có dấu gạch ngang, k1=1,2; b=0,75; body weight 1, section 2, title 1,5. Không cần mọi từ query đều xuất hiện. Exact document ID giới hạn trong record/lineage được phép, không bypass ACL.
4. Khi encoder/index thực sự có vector hợp lệ: encode query cùng revision, dot product trên L2 vectors của các chunk được phép. Dimension/NaN/zero vector sai bị loại. Cosine floor khởi đầu 0,78 chỉ là candidate threshold chưa hiệu chỉnh, không chứng minh đủ evidence.
5. Top 20 mỗi kênh, RRF `1/(60+rank_BM25) + 1/(60+rank_vector)`; không tạo điểm cho kênh thiếu. Tie-break chunk ID xác định. Deduplicate overlap, tối đa 2 chunk/section, 6 chunk tổng, passage text tối đa 6.000 byte. Chat mặc định 3 chunk cho context nhỏ; tool tổng vẫn có cap Phase 6.2.
6. Recheck ACL/source/hash/ref trước trả passage và sau các await; thay state/phiên giữa lượt → stale/unauthenticated, không trả snapshot cũ.

Index nằm trong RAM, không vector database hoặc persist cache không kiểm chứng. Fingerprint eligible content/publication/ACL quyết định generation; vector cache keyed encoder identity/revision + exact title/section/text, tối đa 2.000 entry. Business revision không đổi tài liệu không re-embed text. Reset/import workspace mới không tái dùng answer/evidence cũ; vector thuần của text/model giống nhau có thể tái dùng an toàn, stateRef/citation luôn cấp lại.

Draft update/mask/review chưa vào index; publish/add eligible/change title/text → generation mới; ACL/revoke/expiry/date/version → predicate deny ngay và generation mới khi query tiếp theo. Không query trên index cũ để giữ hybrid. Global published embeddings chỉ ở bộ nhớ server; ranking/statistics/count cho từng query chỉ dùng tập principal được phép. Build/encode lỗi hạ BM25 đúng snapshot, không dùng nguồn superseded. Một encoder queue, deadline index 15 giây, không tải model khi query. Native inference đang chạy chỉ có thể abort sau khi batch hoàn thành; request không nhận late answer.

## Grounded generation và citations

OpenRouter ban đầu diễn giải câu hỏi/follow-up rồi chọn tool. `search_internal_documents` gọi RAG service; `get_document_passages` chỉ lấy evidence ID đã cấp trong lượt và kiểm exact chunk. Công cụ nghiệp vụ khác vẫn đọc selector, chỉ read-only.

Sau khi tool đã đọc passage, lượt generation được tạo mới với system policy, câu hỏi/context câu hỏi gần nhất và evidence JSON gắn **EVIDENCE_UNTRUSTED**. Không cấp tools ở lượt generation, không cho nội dung tài liệu mở rộng sang employee/command/network. Source không thể thay principal hoặc lấy key vì key không nằm trong prompt, và resolver không có tool ghi.

Generation qua cùng OpenRouter transport/model, structured output khi provider hỗ trợ; JSON thường cũng phải qua schema. Output là `insufficientEvidence` và các claim gồm text/evidenceIds/exact quotes. Máy chủ kiểm:

- IDs thuộc đúng retrieved ledger, không nhận title/URL do model bịa.
- Mọi claim có quote thật là substring của passage; source/span/hash/ACL/version/ref còn hợp lệ.
- Token số của claim có trong quote đúng token (1 không khớp 10); hỗ trợ từ vựng tối thiểu 80% và guard phủ định bảo thủ trên câu gần nhất.
- Không chấp nhận URL/HTML hoặc JSON/schema không hợp lệ. Citation href/title/ID/version/section chỉ do server dựng.

Đây là guard bảo thủ, **không phải entailment model hoặc bằng chứng mọi diễn giải đều đúng**. Nó có thể từ chối paraphrase hợp lệ và vẫn có thể bỏ sót diễn giải sai tinh vi. Chưa đo generation quality bằng model thật. Khi thiếu evidence, model trả explicit abstention, không suy định mức 3 bộ/năm thành chu kỳ 4 tháng. Khi generation/citation/provider lỗi, trả các trích đoạn đã kiểm với nhãn dự phòng, không hiển thị lời văn model chưa đạt kiểm tra. Mọi số/quyết định nghiệp vụ vẫn do domain engine.

Citation gồm evidenceId, documentTitle/root/physical ID, version, section title/ID, chunk ID, offsets, exact passage/hash, publication/ACL fingerprint và stateRef. UI có số [n] tương ứng source cards, hiển thị record/version/mục. Link dạng `/tai-lieu/<record>?version=<v>&chunk=<hash>#<section>`.

Khi mở link online, reader gọi lại GET document với version/chunk. Server xác thực phiên, role/ngày/lineage/chunk; không fallback citation cũ sang bản mới. Nguồn bị đổi/thu hồi thì 404 chung, không title/snippet. Reader chỉ hiển thị sau xác nhận và dùng `<mark>` đúng span; ref mới làm ẩn source/answer cũ, request trễ bị bỏ. Thao tác tìm bằng câu hỏi ở Document Lookup cũng gọi endpoint server, debounce 300 ms, có loading/empty/degraded feedback. Browse và editor/quy trình ký giữ nguyên.

## API và giới hạn

- `POST /api/documents/search`: session/Origin/CSRF; query <=500 ký tự, filters category/department/documentId, limit <=6 và expectedStateRef. Không nhận role/actorId/raw snapshot. 60 search/phút/session, tối đa 2 search đang chạy/process.
- `GET /api/documents/:id?version=...&chunk=...`: kiểm lại source, trả sanitized document và highlight khi citation hợp lệ. URL không phải token cấp quyền.
- `POST /api/assistant/query`: giữ giới hạn 3 completion/2 tool rounds/6 tool calls, 30 giây, output 800 tokens/completion, request body 18 KB, provider timeout/rate/cost ledger từ Phase 6.2. Không thêm completion trả phí để tự sửa source vô hạn.
- `GET /api/assistant/status`: capability mode và semantic readiness, không model/key/path riêng tư.

## File thay đổi

| Phần             | File                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| RAG mới          | `server/rag/{chunks,embeddings,retrieval,generation,evaluation}.ts`                                             |
| Backend tích hợp | `server/{assistant,tools,openrouter,app,index}.ts`                                                              |
| UI/contract      | `src/features/{documents,assistant}.tsx`, `src/domain/assistant-documents.ts`, `src/online/protocol.ts`         |
| Model/operator   | `scripts/provision-rag-model.mjs`, scripts npm `rag:provision`, `rag:check`, `rag:evaluate`, `test:rag`         |
| Test/QA          | `server/rag/rag.test.ts`, `src/test/rag.test.tsx`, `tests/e2e/{online-server,online.spec}.ts`, `scripts/qa.mjs` |
| Tài liệu         | Báo cáo này, [đánh giá](ai-rag-evaluation.md), README và các ghi chú trạng thái Phase 6.1/6.2                   |

Không cài dependency, không thay lockfile hoặc `.env`, không đổi dữ liệu synthetic đang lưu. Model runtime là tùy chọn cần provision ở máy có mạng. Build SSR dùng dynamic import package ngoài bundle khi thực sự bật encoder; online browser không import package/model/corpus index.

## Kiểm chứng và giới hạn

Kết quả thực thi cuối nằm trong [ai-rag-evaluation.md](ai-rag-evaluation.md) và `output/qa/{summary,rag-evaluation,vitest}.json`. Normal tests dùng mock ở ranh giới OpenRouter và injected encoder contract fixture, chạy domain/session/state/RAG thật; không cần paid API.

Các giới hạn còn lại: local inference/semantic benchmark chưa chạy; live LLM quality/credit/provider route chưa xác minh; local JSON/session demo không là security enterprise; vẫn dùng business date demo; chưa OCR/parser PDF; chưa reranker/vector DB, đa process/HA/SSO, streaming hoặc generation entailment được chứng nhận. Phải chạy lại browser trên host mở localhost được. Phase 6.4 chưa bắt đầu.
