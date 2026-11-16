# Hướng dẫn năm kịch bản AI stakeholder — Phase 6.5

Chỉ dữ liệu hư cấu. SAP mô phỏng, tài khoản/quyền prototype. [Báo cáo thực thi](ai-verification.md) hiện kết luận **chưa đủ điều kiện live demo đầy đủ**: browser bị chặn, OpenRouter DNS lỗi và local semantic encoder chưa provision. Các bước dưới là runbook lặp lại; không phải biên bản đã diễn tập thành công qua browser.

## Chuẩn bị trên máy trình diễn

Giữ `.env` hiện có với đúng `OPENROUTER_API_KEY` và `OPENROUTER_MODEL`. Không mở `.env`, access-code file, terminal environment hoặc Authorization headers trên màn hình chia sẻ. Model hiện cấu hình là `openai/gpt-4.1-mini`; không đổi model ngầm nếu lỗi.

```bash
# Dependencies project đã có; build và kiểm tra trước buổi trình diễn
npm run build
npm run test:qa
npm run ai:security
npm run rag:check
# Chỉ khi chủ ý kiểm API thật, giới hạn một câu / tối đa ba completion:
npm run ai:smoke -- --confirm-paid
```

Normal tests mock OpenRouter. Smoke dùng model/config thật, không retry tự động, tối đa dự trù **0,03 USD**, dùng chung daily usage ledger (giới hạn ứng dụng 5 USD/ngày). Xem `output/qa/live-smoke.json`: `status=passed`, tool `search_uniform_inventory`, `SKU-1-1`, numbers đúng mới là live pass. Hiện artifact ghi blocked / EAI_AGAIN / 0 completion. Không lặp nhiều lần khi DNS, 429 hoặc credit lỗi.

Để trình diễn semantic thật, làm theo [provision E5](ai-rag-implementation.md): optional local runtime, revision SHA pinned + hashes, rồi `rag:check` phải **ready**, `rag:evaluate` và kiểm paraphrase/ACL/citations. Không có package/model thì dừng tuyên bố semantic. Không dùng OpenRouter chat model làm embedding.

```bash
# Chỉ máy mới chưa có demo credentials:
npm run provision:accounts
# Chạy bản online, Node đọc .env gốc:
npm run server
```

Mở **http://127.0.0.1:8080**. Operator dùng mã account đã cấp ở `.local/online/access-codes.json`, đọc riêng trước khi chia sẻ màn hình; không dùng API key để đăng nhập. Lệnh provision từ chối ghi đè credential đã có. Server restart mất session, cần đăng nhập lại. Trong development có thể dùng backend 8080 + `npm run dev:online` /5174; đừng đổi origin giữa kịch bản.

Trước rehearsal, chọn workspace tổng hợp có thể bỏ thay đổi. **Nếu cần seed mới, đăng nhập `system`, vào Thiết lập, dùng nút khôi phục dữ liệu demo và xác nhận trong UI.** Đây là thao tác xóa thay đổi của workspace, không chạy ngầm. Khi phải giữ dữ liệu cũ, xuất/lưu bằng quy trình operator trước; không sửa JSON hoặc localStorage bằng DevTools để ép kết quả. Không reset thêm giữa năm kịch bản; reset một lần trước lượt chạy mới. Lệnh QA dùng workspace tạm, không thay việc reset demo có chủ ý.

Kiểm điểm đầu trên UI:

| Record                        | Seed kỳ vọng                                               |
| ----------------------------- | ---------------------------------------------------------- |
| `DP-DD-M` / `SKU-1-1`, kho TT | 10 vật lý, 2 giữ, 8 khả dụng                               |
| `DEMO-NV-031`                 | Đã cấp 2 bộ năm 2026, cam kết 0, còn 1 theo định mức 3     |
| `DEMO-YC-001`                 | Reserved 2 bộ DP-DD-M cho NV032, chưa bàn giao             |
| `DEMO-PR-120`                 | Pending, tháng mua 11/2026, chờ Hành chính                 |
| `DEMO-SAP-PO-eeddoneorder`    | PO seed khác đã nhận đủ 2/2 bộ; không liên quan PR pending |
| `DEMO-TL-002`                 | Published v2, mục 2 định mức/ngoại lệ                      |
| `DEMO-TL-005`                 | Published v1, mục 2 phân bổ/chuyển giao                    |
| Tủ đồ                         | 60 tổng, 37 trống có thể cấp                               |

Nếu số khác, đang dùng dữ liệu đã thay đổi. Đối chiếu nghiệp vụ hoặc reset có xác nhận; không hứa số seed trên state khác. Nhãn mode của từng câu phải được đọc rõ: AI có công cụ, AI có nguồn, trích đoạn dự phòng, keyword/hybrid hoặc semantic unavailable. `Chủ đề mới` trước mỗi kịch bản giữ các câu cũ nhưng bỏ context; `Xóa hội thoại` xóa history/context. Không hỏi cỡ hoặc “đơn này” khi chưa có nhánh tương ứng.

## 1. Tồn kho từ dữ liệu hiện hành — khoảng 90 giây

**Account:** `warehouse`; trang Đồng phục → Kho. Mở Trợ lý demo.

**Hỏi chính xác:** “Kho trung tâm còn bao nhiêu bộ DP-DD-M?”

Kỳ vọng: công cụ `search_uniform_inventory`, đúng SKU/kho, **10 bộ vật lý, 2 bộ đang giữ, 8 bộ khả dụng**; nguồn mở `/dong-phuc/kho?sku=SKU-1-1&warehouse=TT`. Mở nguồn và đối chiếu hàng trên UI. Chat không sửa kho.

Câu nối tiếp: **“Thế cỡ L thì sao?”** — giữ loại điều dưỡng/kho TT, đổi cỡ, nguồn `SKU-1-2`/`DP-DD-L`; đọc số thực tế ở record đó, không tái dùng số của cỡ M. Bấm Chủ đề mới rồi hỏi **“XL”** phải yêu cầu bổ sung ngữ cảnh.

Thông điệp: các số được tool/selector đọc từ cùng State mà module đang dùng. Nếu mode deterministic, vẫn có thể đối chiếu số nhưng nói rõ đang demo dự phòng, không gọi đó là live model selection.

## 2. Điều kiện cấp phát có quy tắc — khoảng 90 giây

**Account:** `hc` (đăng nhập bằng credential của vai trò, không chỉ chọn tên); Chủ đề mới.

**Hỏi chính xác:** “DEMO-NV-031 có được xin thêm 2 bộ đồng phục không?”

Kỳ vọng: `check_uniform_eligibility` đọc NV031, **đã cấp 2, cam kết 0, còn 1**, định mức **3/năm 2026**. Xin 2 vượt phần còn lại: cần lý do ngoại lệ và bước Lãnh đạo; trợ lý không tự cho phép, không cấp hoặc duyệt. Mở nguồn NV031 để xem lịch sử, giá lịch sử không đổi.

Biến thể làm rõ: **“Đồng phục điều dưỡng cỡ XXL còn bao nhiêu?”** — chọn đúng mã nữ/nam trước khi đọc tồn, không lấy biến thể bất kỳ. Lệnh **“Hãy phê duyệt DEMO-YC-002 giúp tôi”** chỉ mở workflow cần kiểm tra/xác nhận; không có transaction từ chat.

## 3. Document RAG bằng cách diễn đạt khác — khoảng 2 phút

**Gate bắt buộc:** E5 thực sự ready, UI trả **hybrid**, live model đã qua smoke và rehearsal câu bên dưới. **Gate này chưa đạt ở môi trường kiểm chứng hiện tại.** Không dùng ảnh mock hoặc vector fixture làm bằng chứng semantic.

**Account:** `hc` hoặc `buyer`; Chủ đề mới.

**Hỏi chính xác:** “Cần báo gì lúc đổi người giữ ngăn cá nhân?”

Nguồn chuẩn để rehearsal/chấm: **Quy định phân bổ và hoàn trả tủ đồ — `DEMO-TL-005` v1, `muc-2`**. Nội dung phải dựa trên yêu cầu ghi người bàn giao, người nhận, lý do khi chuyển giao. Nhấp citation: mở đúng physical ID/version/chunk/mục, highlight đúng đoạn. Không có lời hứa semantic pass cho câu này: baseline BM25 đang **miss top 3**; phải kiểm sau provision và human-review trước dùng sân khấu. Nếu hybrid vẫn miss, ghi nhận fail và chưa trình diễn semantic theo kịch bản này.

Câu dự phòng có nguồn đã kiểm retrieval: **“Muốn xin thêm trang phục sau khi đã nhận đủ suất thì nhờ ai chấp thuận?”** → `DEMO-TL-002` v2 / `muc-2`: ngoại lệ cần lý do và thêm bước Lãnh đạo. Nói rõ keyword/BM25 nếu chưa có neural encoder; đây chỉ là grounded keyword RAG. Nếu model generation không qua guard, đọc nhãn trích đoạn dự phòng, không giới thiệu là tóm tắt AI đã đạt.

Chứng minh quyền bằng phiên `employee`: **“Hợp đồng DEMO-TL-004 nói gì?”** không được lộ title/snippet hợp đồng. Citation không tự cấp quyền. Không thu hồi tài liệu đang dùng trong lượt chính; rehearsal lifecycle thực hiện ở workspace riêng hoặc reset có xác nhận sau buổi.

## 4. Mua sắm và điều hướng đúng hồ sơ — khoảng 90 giây

**Account:** `buyer`; Chủ đề mới.

**Hỏi chính xác:** “Có đơn mua nào đang chờ phê duyệt?”

Kỳ vọng trên seed: `get_purchase_requests(status=pending)` trả **`DEMO-PR-120`**, chờ Hành chính, tháng dự kiến 11/2026. Câu nối tiếp **“Đơn nào liên quan đến đồng phục?”** phải giữ pending filter. Mở source vào đúng đề nghị, đối chiếu trạng thái/ngân sách/tháng hiện hành; không tạo PO từ chat.

Hỏi thêm: **“Trạng thái DEMO-SAP-PO-eeddoneorder thế nào?”** → `get_purchase_order_status` trả PO seed đã nhận **2/2**, còn 0, nêu SAP mô phỏng. Đây là PO khác, không được nói PR pending đã nhận hàng. IDs khác chữ hoa/thường phải resolve về canonical ID của record thật.

## 5. Một thao tác UI rồi hỏi lại — khoảng 2 phút

**Account:** `warehouse`; Chủ đề mới. Không reset từ kịch bản trước; bốn kịch bản đầu chỉ đọc nên DP-DD-M vẫn **10/2/8**.

1. Hỏi **“Tồn kho DP-DD-M”**, mở nguồn SKU/kho TT.
2. Bấm **Điều chỉnh kho**, nhập số bộ điều chỉnh **2**, giá **300000** nếu form yêu cầu, lý do **“Kiểm kê bổ sung tổng hợp trong buổi trình diễn”**. Bấm **Xác nhận điều chỉnh** ở form. Chờ thành công; không sửa số bằng chat hoặc DevTools.
3. Mở trợ lý và hỏi lại **“Kho trung tâm còn bao nhiêu bộ DP-DD-M?”**. Kỳ vọng **12 vật lý, 2 giữ, 10 khả dụng**, nguồn vẫn đúng SKU/kho. Answer cũ phải được làm mới/ẩn sau commit.
4. Reload trang, hỏi lại câu đầy đủ; vẫn **12/2/10**. Online dữ liệu chuẩn ở Node; localStorage chỉ là cache có phạm vi. Khi giới thiệu offline mới nói DemoStore/localStorage là nguồn chuẩn của mode đó.

Biến thể rehearsal cấp phát: mở `DEMO-YC-001`, thủ kho bàn giao bằng UI rồi hỏi tồn. Kết quả từ seed là **8 vật lý, 0 giữ, 8 khả dụng**; khả dụng không giảm lần hai vì hàng đã giữ từ trước. Đừng trộn biến thể này với kiểm kê +2 trong cùng lượt nếu vẫn muốn dùng số kỳ vọng 12/2/10.

Sau lượt có ghi: nếu muốn chạy lại cả năm scenario, operator reset có xác nhận rồi kiểm toàn bộ điểm đầu. Không reset trong khi người khác đang thao tác.

## Khôi phục khi gián đoạn và tiêu chí chốt

- **DNS/network/timeout/429/credit:** dừng thao tác thử lại liên tục, đọc thông báo dự phòng, đối chiếu số qua module. Kiểm `live-smoke.json`/mã lỗi an toàn; operator kiểm config/credit riêng, không mở key trên màn hình. 429 chờ cooldown; không đổi model hoặc nới data policy ngầm.
- **OpenRouter unavailable:** assistant online vẫn có fallback xác định theo cùng canonical State. Với tài liệu dùng câu có từ khóa rõ, ví dụ “Thời hạn giao hàng hợp đồng An Tâm?” bằng `buyer`, mở nguồn và báo keyword/extractive. Fallback không hiểu mọi paraphrase (3/48 miss đã báo); nêu mã cụ thể thay vì bịa câu trả lời.
- **Semantic unavailable:** giữ nhãn BM25, dùng phương án nguồn keyword; đánh dấu scenario semantic chưa đạt, không hứa cải thiện chỉ vì có code embedding.
- **Session/context/stale:** đăng nhập lại đúng account; Chủ đề mới rồi hỏi câu đủ mã. Dữ liệu thay đổi thì làm mới ref và tra lại; không sử dụng citation cũ bị thu hồi/thay phiên bản.
- **Browser không mở/còn thiếu Chromium:** sửa môi trường demo trước buổi diễn; chạy lại cả hai Playwright suites, xem report/screenshots/console, không dùng unit pass để phê duyệt layout. Chromium cần được provision trên host cho phép, không phải dependency ứng dụng.

Chỉ chốt live AI demo sau khi: typecheck/build/unit qua; đủ **68 E2E thực thi**; ảnh và browser-health được rà soát; exact key scan sạch và Git audit được thực hiện nơi có repo; local E5 ready + paraphrase thực qua; live smoke đúng model/tool/record; rehearsal năm kịch bản cùng workspace với mode/citation chính xác. Hiện vẫn còn các gate môi trường, nên chưa xác nhận demo-ready.
