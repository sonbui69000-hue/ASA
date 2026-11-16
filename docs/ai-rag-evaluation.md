# Đánh giá Document RAG — Phase 6.3

> Hiện trạng Phase 6.4: đã cải tiến UX/context/clarification và điều hướng nguồn. Xem [ai-ux-verification.md](ai-ux-verification.md) để biết kết quả 300 tests, các giới hạn browser/semantic và trạng thái mới nhất. Mô tả phase trước dưới đây được giữ làm lịch sử.

Đánh giá thực thi ngày 10/11/2026. Mã/pipeline và vận hành: [ai-rag-implementation.md](ai-rag-implementation.md). Không thực hiện Phase 6.4.

## Phân biệt kết quả

| Trục đánh giá               | Kết quả đo được                                                                            | Điều chưa được chứng minh                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Retrieval BM25              | Recall@3 **28/30 = 93,33%**, MRR@3 **0.8556**                                              | Không phải semantic/hybrid accuracy hoặc độ chính xác trên dữ liệu thật                                |
| Câu thường/keyword baseline | 26/26 có đúng mục trong top 3                                                              | Corpus nhỏ và ground truth do người triển khai xác định, chưa là blind benchmark                       |
| Paraphrase ít trùng từ      | **2/4 = 50%** có đúng mục trong top 3                                                      | Chưa chạy E5 để đo mức cải thiện; không thay bằng dictionary/synonym rồi gọi semantic                  |
| Citation correctness        | **88/88** citation khớp record/version/section/span/hash/ACL                               | Nguồn có thật không có nghĩa mọi nguồn liên quan hoặc mọi nhận định được entail                        |
| Negative ACL/lifecycle      | **5/5** trả 0 passage, không title/snippet                                                 | Không phải chứng nhận security sản xuất                                                                |
| Generation quality          | Structured generation/quote/citation/numeric/polarity/fallback kiểm bằng mocked OpenRouter | Chưa có live answer, human factual grading, LLM entailment benchmark hoặc credit/provider verification |
| Local semantic inference    | `rag:check`: **semantic_unavailable**, exit 1                                              | Package/model chưa có; DNS registry bị EAI_AGAIN, chưa tải được artifact                               |

**Không tuyên bố real semantic RAG đã chạy thành công.** Code local E5 + hybrid đã triển khai, nhưng môi trường này chỉ kiểm được BM25 và neural-adapter/vector contracts bằng fixtures. Prompt 6.3 có yêu cầu báo rõ khi embedding không khả dụng; gate vận hành semantic và đánh giá model thật còn mở. Không dùng paid OpenRouter API trong normal tests hoặc lượt evaluation này.

## Bộ câu hỏi và nguồn kỳ vọng

Corpus cố định: [synthetic seed](../src/data/seed.ts); role/date/version từ chính `createSeed()`. Mỗi câu có một nguồn/mục chuẩn chính để chấm; các mục liên quan khác có thể tồn tại. Giữ nguyên dữ liệu ứng dụng; evaluation dùng seed cô lập, không reset/import canonical workspace.

Phương pháp: `DocumentIndex.search` với ACL hiện hành, limit 3, expected physical document/version/section. Recall@3 = tỷ lệ câu có mục chuẩn trong 3 passage đầu; MRR@3 = trung bình 1/rank, 0 nếu không thấy. Citation kiểm mọi passage đã trả, kể cả passage không phải ground truth. Chưa hiệu chỉnh cosine threshold bằng semantic corpus vì local encoder vắng mặt.

| #   | Câu hỏi tiếng Việt                                                      | Account | Nguồn kỳ vọng              | Rank BM25 thực thi |
| --- | ----------------------------------------------------------------------- | ------- | -------------------------- | ------------------ |
| 1   | Thông tin nào phải ghi khi gửi yêu cầu hành chính?                      | `hc`    | `DEMO-TL-001` v1 / `muc-1` | 2                  |
| 2   | Ai kiểm tra nhu cầu trước khi Hành chính xử lý?                         | `hc`    | `DEMO-TL-001` v1 / `muc-2` | 1                  |
| 3   | Yêu cầu bị từ chối cần ghi gì?                                          | `hc`    | `DEMO-TL-001` v1 / `muc-2` | 1                  |
| 4   | Xác nhận đã đọc bản cũ có thay cho bản mới không?                       | `hc`    | `DEMO-TL-001` v1 / `muc-3` | 1                  |
| 5   | Cỡ 2XL được chuẩn hóa thế nào?                                          | `hc`    | `DEMO-TL-002` v2 / `muc-1` | 1                  |
| 6   | Nhân viên ngừng hoạt động có được đề nghị đồng phục không?              | `hc`    | `DEMO-TL-002` v2 / `muc-1` | 1                  |
| 7   | Mỗi năm một nhân viên được bao nhiêu bộ trang phục?                     | `hc`    | `DEMO-TL-002` v2 / `muc-2` | 3                  |
| 8   | Nhân viên cần làm gì khi muốn xin cấp lại đồng phục vượt định mức?      | `hc`    | `DEMO-TL-002` v2 / `muc-2` | 1                  |
| 9   | Đang cam kết có tính vào định mức hằng năm không?                       | `hc`    | `DEMO-TL-002` v2 / `muc-2` | 1                  |
| 10  | Thủ kho bàn giao thì tồn vật lý thay đổi lúc nào?                       | `hc`    | `DEMO-TL-002` v2 / `muc-3` | 1                  |
| 11  | Hủy trước bàn giao có giải phóng hàng giữ không?                        | `hc`    | `DEMO-TL-002` v2 / `muc-3` | 1                  |
| 12  | Đổi giá danh mục có đổi giá cấp phát lịch sử không?                     | `hc`    | `DEMO-TL-002` v2 / `muc-3` | 1                  |
| 13  | Mua dự trữ giới hạn theo quân số như thế nào?                           | `hc`    | `DEMO-TL-002` v2 / `muc-4` | 1                  |
| 14  | Một đề nghị mua có được dùng hai nhà cung cấp không?                    | `buyer` | `DEMO-TL-003` v1 / `muc-1` | 1                  |
| 15  | Phần thiếu đã cam kết mua có được mua trùng không?                      | `buyer` | `DEMO-TL-003` v1 / `muc-1` | 2                  |
| 16  | Những bộ phận nào duyệt đề nghị mua?                                    | `buyer` | `DEMO-TL-003` v1 / `muc-2` | 1                  |
| 17  | Người gửi có được tự duyệt đề nghị của mình không?                      | `buyer` | `DEMO-TL-003` v1 / `muc-2` | 1                  |
| 18  | Tạo PO đã làm tăng số lượng trong kho chưa?                             | `buyer` | `DEMO-TL-003` v1 / `muc-3` | 1                  |
| 19  | Có thể nhận hàng nhiều lần nhưng vượt lượng đặt không?                  | `buyer` | `DEMO-TL-003` v1 / `muc-3` | 1                  |
| 20  | Mã hàng và chất liệu điều dưỡng cỡ M trong hợp đồng là gì?              | `buyer` | `DEMO-TL-004` v1 / `muc-2` | 1                  |
| 21  | Hợp đồng cho giao hàng sau bao nhiêu ngày làm việc?                     | `buyer` | `DEMO-TL-004` v1 / `muc-2` | 1                  |
| 22  | Sai cỡ hoặc thiếu hàng phải xác nhận nhận hàng thế nào?                 | `buyer` | `DEMO-TL-004` v1 / `muc-3` | 1                  |
| 23  | Một nhân viên có được dùng hai tủ đồ cùng lúc không?                    | `hc`    | `DEMO-TL-005` v1 / `muc-1` | 3                  |
| 24  | Không đủ tủ có được tự phân bổ một phần không?                          | `hc`    | `DEMO-TL-005` v1 / `muc-2` | 1                  |
| 25  | Chuyển giao tủ phải ghi những ai và lý do gì?                           | `hc`    | `DEMO-TL-005` v1 / `muc-2` | 1                  |
| 26  | Tủ đang bảo trì có coi là tủ trống để cấp không?                        | `hc`    | `DEMO-TL-005` v1 / `muc-3` | 1                  |
| 27  | Muốn xin thêm trang phục sau khi đã nhận đủ suất thì nhờ ai chấp thuận? | `hc`    | `DEMO-TL-002` v2 / `muc-2` | 1                  |
| 28  | Đặt mua xong nhưng chưa có hàng về thì số dư kho có đổi ngay?           | `buyer` | `DEMO-TL-003` v1 / `muc-3` | 1                  |
| 29  | Nếu không đủ chỗ giữ tư trang thì hệ thống có tự chia bớt suất còn lại? | `hc`    | `DEMO-TL-005` v1 / `muc-2` | Không trong top 3  |
| 30  | Cần báo gì lúc đổi người giữ ngăn cá nhân?                              | `hc`    | `DEMO-TL-005` v1 / `muc-2` | Không trong top 3  |

Câu 27–30 là nhóm paraphrase ít trùng từ. Hai câu về “chỗ giữ tư trang/ngăn cá nhân” không lấy được mục tủ đồ trong top 3: đây là lỗi retrieval baseline đã quan sát, không được báo semantic pass. Không thêm từ đồng nghĩa vào production để che lỗi này; cần provision E5, chạy lại cùng ground truth và so BM25/hybrid.

## Ca âm tính bắt buộc

| Query record  | Account    | Lý do không là nguồn hợp lệ | Passage trả về |
| ------------- | ---------- | --------------------------- | -------------- |
| `DEMO-TL-004` | `employee` | restricted                  | 0              |
| `DEMO-TL-006` | `docs`     | draft                       | 0              |
| `DEMO-TL-007` | `hc`       | withdrawn                   | 0              |
| `DEMO-TL-008` | `hc`       | expired                     | 0              |
| `DEMO-TL-999` | `buyer`    | not-found                   | 0              |

Thêm unit/API tests cho nguồn bị đổi quyền/thu hồi trong lúc generation chờ, expired-date eligibility, archive còn published khi draft v3, publish thay thế v2, conflict lineage, ID giả, source text/hash bị sửa, câu thiếu evidence, document prompt injection và tool scope. Nguồn không được phép dùng response chung, không xác nhận title hay snippet bị che.

Câu hỏi không có quy định trong corpus nhưng vẫn có đoạn hàng xóm liên quan (ví dụ “cứ bốn tháng lại cấp đồng phục phải không?”) cần **generation abstention**, không thể đánh giá chỉ bằng retrieval empty. Schema/validator có test abstention và từ chối số không có trong nguồn. Chưa chấm live abstention rate của model cấu hình.

## Kiểm thử đã thực thi

Lượt `npm run test:qa` cuối: **2026-11-10T16:47:39.297Z–2026-11-10T16:48:03.830Z**. Artifacts: `output/qa/summary.json`, `vitest.json`, `rag-evaluation.json`; không lấy discovery làm executed E2E.

| Lệnh/kiểm tra                    | Kết quả                                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript, cả backend/UI/E2E    | Pass, exit 0                                                                                                                        |
| Build offline / online / backend | Cả ba pass, exit 0                                                                                                                  |
| Vitest/React Testing Library     | **270 pass / 0 fail / 0 skip**, 20 files                                                                                            |
| Tăng so với Phase 6.2            | 45 test mới; 225 test cũ tiếp tục pass                                                                                              |
| `rag:evaluate` trong QA          | Pass thực thi pipeline BM25; 30 câu dương + 5 âm, metrics như trên                                                                  |
| `rag:check`                      | Thực thi, exit 1 / semantic_unavailable; không phải model inference pass                                                            |
| Playwright discovery             | 48 offline + 10 online = **58 đăng ký**                                                                                             |
| Playwright execution             | Cả hai suite bị chặn webServer; **58 chưa thực thi**, 0 journey/screenshot xác minh                                                 |
| Localhost probe trực tiếp        | `EPERM 127.0.0.1:8080`                                                                                                              |
| Existing `.env` loader           | Hai biến đúng tên hiện diện; chỉ in boolean, không giá trị                                                                          |
| Quét key/bundle                  | Không thấy giá trị key trong source/docs/build; online JS không chứa tên biến key/model, runtime embedding hoặc đáp án seed hạn chế |
| Dependencies/lockfiles           | Không cài package; package-lock và skills-lock không thay                                                                           |

QA overall: **incomplete / exit 1** vì browser không khởi động được. Các bước compile/build/unit/evaluation pass không thay việc kiểm browser còn thiếu. Hai journey RAG online mới chạy ở desktop/mobile khi môi trường cho mở cổng: source link → version/section highlight → revoke → nguồn cũ bị chặn; natural-question search → đối chiếu và mở mục. Browser fixture chỉ fake OpenRouter transport; backend, state, ACL, retrieval, reader và UI thật. Không lấy neural fixture làm model E5 thật.

## Đánh giá lại trên máy có local model

1. Cài optional runtime và provision revision/hash như [hướng dẫn](ai-rag-implementation.md); `rag:check` phải báo ready. Ghi model revision, package/runtime, RAM/disk và latency cold/warm.
2. Chạy `npm run rag:evaluate`; giữ corpus/câu hỏi/ACL, báo BM25 và hybrid riêng. So kết quả nhóm paraphrase, không chỉ điểm aggregate. Mọi citation/ACL negative vẫn phải đúng.
3. Chạy `npm run test:qa` trên host mở localhost được; không dùng kết quả browser lịch sử thay bằng lượt này.
4. Nếu đánh giá LLM thật, dùng model từ OPENROUTER_MODEL và budget hiện có; người rà soát chấm từng factual claim, đúng nguồn, đúng diễn giải, không suy chính sách thiếu bằng chứng, abstention và injection. Chưa triển khai auto paid evaluator hoặc thêm phase mới.

Hạn chế chính: tập nhỏ synthetic không đại diện tài liệu bệnh viện thật; token/byte chunking chưa benchmark trên văn bản dài; guard từ vựng/phủ định không chứng minh entailment; E5/tokenizer/native runtime chưa chạy ở môi trường này; browser/live generation chưa xác minh. Không mô tả mock RBAC/session demo là bảo mật sản xuất.
