# Danh mục công cụ AI chỉ đọc — Phase 6.1

> Hiện trạng Phase 6.3: pipeline RAG đã được bổ sung; xem [triển khai](ai-rag-implementation.md) và [đánh giá](ai-rag-evaluation.md). Local E5 chưa provision được trong môi trường thực thi nên runtime hiện dùng BM25, không tuyên bố semantic đã hoạt động. Các mô tả phase cũ dưới đây là lịch sử.

> Cập nhật Phase 6.2: đã triển khai backend/tools theo [ai-openrouter-implementation.md](ai-openrouter-implementation.md). Tài liệu này giữ thiết kế tại Phase 6.1; trạng thái triển khai và khác biệt thực tế nằm trong báo cáo mới. Phase 6.3/semantic RAG chưa triển khai.

Trạng thái: đặc tả triển khai tương lai, chưa có tool/API mới. Dựa trên `src/domain/{types,selectors,commands,assistant,assistant-routing,assistant-documents,uniform-attributes,product-search}.ts` và `src/adapters/sap.ts`. Kiến trúc nguồn chuẩn ở [ai-integration-plan.md](ai-integration-plan.md); quyền ở [ai-security-design.md](ai-security-design.md).

## 1. Ranh giới thực thi

Tools là registry nội bộ Node, chỉ được orchestrator gọi; không công khai một endpoint “gọi hàm theo tên”. Mỗi entry có `name`, mô tả tiếng Việt, input/output schema Zod, nhóm quyền, resolver và bộ tạo evidence. Chỉ đăng ký công cụ đọc phù hợp quyền phiên, nhưng **vẫn kiểm quyền mỗi lần gọi** vì tool name/arguments từ LLM là đầu vào không đáng tin.

Mọi resolver nhận context do máy chủ tạo: principal đã xác thực, snapshot State đầy đủ, `(workspaceId, revision)`, policy fingerprint, ngày demo và deadline. Context không thuộc JSON arguments của model. Không nhận `role`, `actorId`, `allowedRoles`, ACL, raw state, đường dẫn file hoặc URL từ tool input. Actor không thể bị đổi bằng câu hỏi “đóng vai quản trị”.

Kiểm: tool name allowlist → JSON parse có giới hạn → schema strict → chuẩn hóa → resolve thực thể trong phạm vi → kiểm module/đối tượng/field → tính bằng hàm xác định → project DTO → output schema → evidence ledger của lượt. Không ghi nghiệp vụ/audit/operations từ tools. Usage/security log là luồng telemetry riêng.

## 2. Quy ước schema dùng chung

Các trường được ký hiệu `?` là tùy chọn trong hợp đồng ứng dụng. Khi provider yêu cầu strict JSON Schema với tất cả property required, biểu diễn trường tùy chọn bằng `null`, rồi chuyển về `undefined` sau parse. Object đóng (`additionalProperties:false`, Zod strict), không ép kiểu string thành number/boolean và không bỏ qua key lạ.

| Kiểu              | Ràng buộc                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EmployeeId`      | Định dạng `DEMO-NV-` + số, chuỗi ≤64 ký tự; sau đó kiểm tồn tại/phạm vi bằng ID thật. Regex không phải authorization.                                      |
| `RecordId`        | Chuỗi ≤128 ký tự; resolve đúng collection. Chấp nhận IDs command sinh theo sequence, không ép tất cả về seed ba chữ số. PO có thể là `DEMO-SAP-PO-*`.      |
| `SkuId/ProductId` | ID nội bộ được resolve từ collection; `productCode` là `Sku.code` hoặc mã NCC đúng loại, không coi code = ID.                                              |
| `Category`        | `doctor`, `nurse`, `technician`, `office` đúng `Job`.                                                                                                      |
| `Gender`          | `male`, `female`, `unisex` đúng `ProductGender`; employee còn có `unspecified`, không suy từ tên.                                                          |
| `Size`            | `normalizeSize`: trim/uppercase, `2XL→XXL`, `XXXL→3XL`; `validSize` cho XS…3XL hoặc 1–99. Size không hợp lệ/không tồn tại không được tự đổi thành cỡ khác. |
| `Warehouse`       | Giao của mã kho trong state và grants phiên; seed có `TT`, `NOI`. Không chấp nhận tên kho tùy ý như một kho mới.                                           |
| `DepartmentId`    | Phải có trong `departments` và trong phạm vi của thao tác; đây chỉ là filter thu hẹp.                                                                      |
| `Year/Quantity`   | Số nguyên an toàn; năm 2000–2100, quantity 1–1000. Không cho NaN, âm, số thập phân hoặc số quá lớn.                                                        |
| `Month/Budget`    | `YYYY-MM` hợp lệ hoặc budget query ≤100 ký tự; dùng `Purchase.context` thực tế, không tự tạo hạn mức ngân sách.                                            |
| `Query`           | 1–500 ký tự sau trim; bỏ control characters không cần thiết, giữ Unicode tiếng Việt và mã sản phẩm.                                                        |
| `Limit/Cursor`    | `limit` 1–20, mặc định 10; cursor opaque gắn tool/principal/stateRef/filter, không offset tùy ý vượt phạm vi.                                              |

Hợp đồng kết quả đề xuất, không phải `Answer` đã triển khai:

```text
ToolResult<T> = {
  status: ok | needs_clarification | empty | unavailable | invalid_input | stale | error,
  data: T | null,
  evidence: EvidenceRef[],
  stateRef: { workspaceId, revision },
  truncated: boolean,
  nextCursor: string | null
}
```

`unavailable` dùng chung cho ID không có và ngoài quyền, không trả title/name/đếm toàn cục để phân biệt. `empty` chỉ dùng khi truy vấn hợp lệ trên tập được phép nhưng không có kết quả. `needs_clarification` chỉ trả ứng viên trong phạm vi. `totalInScope` nếu có là số sau lọc quyền, phải phân biệt tổng và số dòng đang hiển thị.

`EvidenceRef` do backend cấp, gồm ID opaque trong lượt, loại `record/document/configuration`, recordId đã cho phép, các fact/field snapshot allowlist, stateRef; tài liệu bổ sung version/section/chunk/hash. Model chỉ tham chiếu evidence ID đã cấp, không tự viết href, title hoặc quote. Backend dựng đường dẫn SPA từ route allowlist. Không gửi raw State, `DemoDocument.original`, credential, audit detail tự do hoặc dữ liệu người khác qua tool output.

## 3. Các entry

### 3.1 `resolve_employee`

- **Input:** `{ employeeId?: EmployeeId, name?: string(1..120), self?: boolean }`, đúng một tiêu chí. `self=true` lấy employeeId của principal; thiếu cả ba thì hỏi rõ.
- **Nguồn:** `account(s,id)` và `employeesFor(s,a)`; `normalize` cho tên có/không dấu. Xếp thứ tự ổn định theo ID. Chỉ hỗ trợ match tên rõ ràng hoặc danh sách ứng viên có giới hạn, không “chọn người gần giống nhất”.
- **Output:** `{ resolution: resolved|ambiguous, candidates:[{employeeId, displayName, departmentId}] }`; chỉ trả chức danh/gender nếu tool tiếp theo thật sự cần và field policy cho phép. Không trả danh bạ toàn viện.
- **Quyền:** employee chỉ chính mình; coordinator/head trong khoa; các vai trò rộng theo policy máy chủ được ghi rõ. Không tìm thấy trả unavailable, không thay bằng người đang đăng nhập.
- **Chứng cứ:** employee record được phép. Model phải hỏi người dùng chọn ID nếu có nhiều người cùng tên.

### 3.2 `find_uniform_product`

- **Input:** `{ code?: string(1..64), query?: Query, category?: Category, gender?: Gender, size?: Size, limit?: Limit }`, có ít nhất một tiêu chí; mã rõ ràng được ưu tiên resolve chính xác.
- **Nguồn:** `State.skus`, `normalizeSize`, quy tắc tìm sản phẩm đang dùng trong `answerQuery`. `matchesProductQuery` hiện nhận `SupplierProduct`, không giả vờ dùng trực tiếp cho `Sku`; viết adapter tìm SKU theo các field tương ứng.
- **Output:** `{ products:[{skuId,code,name,category,gender,size,active}], totalInScope }`. Giá danh mục là field tùy quyền nghiệp vụ, không mặc định gửi cùng mọi lookup.
- **Quyền:** danh mục được phép của phiên; mặc định hàng active. Một mô tả khớp nhiều SKU thì trả candidates, chưa tự chọn kho/cỡ.
- **Chứng cứ:** SKU ID/code và thông số thực; không sinh SKU mới từ tên hỏi.

### 3.3 `search_uniform_inventory`

- **Input:** `{ code?: string, category?: Category, gender?: Gender, size?: Size, warehouse: Warehouse, limit?: Limit }`; có ít nhất code hoặc thuộc tính sản phẩm. Nếu người dùng chưa nêu kho, orchestrator hỏi rõ hoặc nêu minh bạch mặc định kho trung tâm như assistant hiện hành.
- **Nguồn:** resolve `State.skus`, kiểm warehouse grant rồi `stock(s,skuId,warehouse)`; hàm này tính từ `lots/movements` và reservation của request `reserved`.
- **Output:** `{ warehouse, rows:[{skuId,code,size,gender,physical,held,available,unit:"bộ"}], totalInScope }`. Không đưa người nhận, raw lot/ledger hoặc lý do biến động.
- **Quyền:** policy máy chủ cho kho/sản phẩm; `stock` tự nó không có kiểm quyền. Filter department không được dùng thay warehouse scope.
- **Bất biến:** `available=physical-held`, các số nguyên không âm; công cụ không giữ hàng. SKU không có trả unavailable; SKU có nhưng tổng kho bằng 0 trả số 0, không diễn giải thành không có SKU.

### 3.4 `check_uniform_eligibility`

- **Input:** `{ employeeId: EmployeeId, year?: Year, skuId?: SkuId, quantity?: Quantity }`; năm mặc định từ `settings.date`, không lấy năm đồng hồ hệ điều hành.
- **Nguồn:** quyền `employeesFor`, `issued`, `committed`, `eligibleSku`, `settings.annualLimit`. Đây là kiểm điều kiện tra cứu, không gọi `execute` giả lập ghi rồi bỏ kết quả.
- **Output:** `{ employeeId, year, issued, committed, annualLimit, remaining, quantityRequested, quotaStatus, skuMatches: boolean|null, employeeActive, historicalOnly, caveats[] }`; `remaining=max(0,annualLimit-issued-committed)` cho năm hiện hành. Giữ số đã cấp/cam kết ngay cả khi còn lại bằng 0.
- **Giới hạn:** nếu năm quá khứ không có policy snapshot tương ứng, chỉ trả lịch sử và `historicalOnly=true`, không kết luận điều kiện theo chính sách ngày nay. Không có SKU thì `skuMatches=null`, không báo đủ điều kiện toàn diện. Chưa kiểm tồn/đủ duyệt thì nêu rõ.
- **Quy tắc:** `issued` cộng quantity gốc, không trừ `returned`; committed gồm pending/reserved/waiting_stock. Vượt quota có thể cần lý do ngoại lệ và Lãnh đạo theo command hiện có; không tự xác nhận ngoại lệ. Khi xem request đã gửi phải dẫn `request.limit/stages` snapshot bằng tool trạng thái, không thay bằng policy hiện tại.

### 3.5 `get_employee_issuance_history`

- **Input:** `{ employeeId: EmployeeId, year?: Year, limit?: Limit, cursor?: string }`.
- **Nguồn:** kiểm `employeesFor`, đọc `State.issuances` đúng employee/năm, `lastIssuedDate`; join SKU bằng ID, không join tên. Quyền theo bản ghi lịch sử được nêu ở security design khi nhân viên chuyển khoa.
- **Output:** `{ employeeId, year, issuedTotal, lastIssuedDate, rows:[{issuanceId,requestId,date,skuCode,size,quantity,returned}], totalInScope }`; giá/chi phí lịch sử chỉ thêm khi principal có quyền tài chính tương ứng, từ `Issuance.price`.
- **Chứng cứ:** issuance và request liên kết; route request phải tái kiểm quyền. Không lấy giá hiện hành thay giá cấp, không tiết lộ các nhân viên khác trong request cùng nhóm.

### 3.6 `get_uniform_request_status`

- **Input:** `{ requestId: RecordId }`.
- **Nguồn:** `requestsFor`, `nextRole`, `canApprove`, `linkedPurchases`; không chỉ `s.uniforms.find` không scope.
- **Output:** `{ requestId,status,completedStages,totalStages,nextRole,canCurrentActorApprove,visibleLines,linkedPurchases,linkedOrders }`. `canCurrentActorApprove` là tính toán hiện tại, không là quyền cấp cho model; bản ghi bị từ chối có lý do đã project nếu được phép.
- **Quyền:** `canRequest` hiện cho nhân viên xem request có dòng của họ; DTO chỉ trả dòng của họ. PR/PO liên kết phải đi qua `purchasesFor` và projection riêng, không được mở quyền vì có FK.
- **Chứng cứ:** dossier trạng thái và các liên kết được phép. Nếu thiếu kho là `waiting_stock`, không nói đang chờ người duyệt.

### 3.7 `get_purchase_requests`

- **Input:** `{ requestId?: RecordId, status?: draft|pending|approved|ordered|rejected|cancelled, departmentId?: DepartmentId, month?: Month, budget?: string, sourceRequestId?: RecordId, limit?: Limit, cursor?: string }`.
- **Nguồn:** `purchasesFor`, `purchaseReport`, `nextRole`, `linkedPurchases` sau scope; metadata từ `Purchase.context`. Tháng là tháng mua dự kiến, khoa là khoa ngân sách, không mặc nhiên là khoa người nhận đồng phục.
- **Output:** `{ rows:[{purchaseId,status,nextRole,completedStages,totalStages,context,visibleQuantity,visibleValue,receivedValue}], totalInScope, totalsScope }`; chỉ trả giá trị khi field grant cho phép, nhãn `totalsScope=visible_lines` nếu chỉ xem một phần hồ sơ.
- **Quyền:** record grant chưa cho phép toàn bộ các dòng liên quan khoa khác; lọc dòng và loại note tự do. Không tính tổng toàn viện rồi gửi cho principal chỉ có quyền khoa.
- **Bất biến:** giá trị từ quantity×giá dòng/PO lịch sử, không để LLM tự cộng. PR pending không đồng nghĩa PO đã tạo, `budgetCode` trống không được bịa.

### 3.8 `get_purchase_order_status`

- **Input:** `{ orderId: RecordId }`.
- **Nguồn:** `State.orders` join `purchaseId` vào `purchasesFor`, sau đó lọc field/dòng. Không gọi SAP; adapter hiện không có phương thức tra trạng thái.
- **Output:** `{orderId,purchaseId,status,orderedQuantity,receivedQuantity,remainingQuantity,lines:[{skuId,code,quantity,received,remaining}],context,integration:"simulated_sap"}` trong phạm vi cho phép. Giá/giá trị là tùy field grant.
- **Bất biến:** remaining=ordered−received; `created/partial/received` là enum thật. Không nói SAP thật đã xác nhận hoặc lộ mã PO nếu PR không đọc được.

### 3.9 `search_available_lockers`

- **Input:** `{building?:string(1..80),floor?:string(1..20),area?:string(1..80),ownerDepartmentId?:DepartmentId,quantity?:Quantity,limit?:Limit}`.
- **Nguồn:** `availableLockers`, `lockerStatus`, kiểm policy vị trí; giữ thứ tự xác định area/number/id hiện có, bổ sung tie-break tòa/tầng khi cần. Chuẩn hóa “A”/“Tòa A” theo giá trị vị trí hiện hữu, không tạo địa điểm mới.
- **Output:** `{availableCount,requestedQuantity,sufficient,lockers:[{lockerId,building,floor,area,number,ownerDepartmentId}],selectionIsReservation:false}`. Count tính trước limit nhưng sau permission/filter. Chỉ gợi ý danh sách, không cấp hoặc giữ chỗ.
- **Bất biến:** loại inactive/maintenance/occupied/held. `departmentId` hiện là đơn vị sở hữu, khác `assignedDepartmentId`; không dùng chúng thay nhau. Thiếu số lượng thì báo thiếu, không tuyên bố đã phân bổ một phần.

### 3.10 `get_locker_assignments`

- **Input:** `{lockerId?:RecordId,employeeId?:EmployeeId,assignedDepartmentId?:DepartmentId,includeHistory?:boolean,limit?:Limit}`, đúng một chủ thể. “Tủ của tôi” resolve employeeId từ principal.
- **Nguồn:** `canReadLocker`, `employeesFor`, `lockerEventsFor`, `State.lockers`; employee lookup phải kiểm phạm vi trước đọc assignment. Xem lịch sử dùng quyền lịch sử riêng, không vì tủ hiện trống mà lộ người cũ.
- **Output:** `{rows:[{lockerId,location,status,employeeId?,assignedDepartmentId?,reservedFor?}],events?:[{date,action,from,to}]}`. Các identity được project, không note/lý do tự do trái phạm vi.
- **Quyền:** lịch sử chuyển giao chỉ trả khi cả `from/to` được phép theo `lockerEventsFor`. Người nhận đơn vị/giữ chỗ phải được phân biệt với assignment nhân viên.

### 3.11 `get_supplier_candidates`

- **Input:** `{skuId:SkuId,query?:Query,limit?:Limit}`.
- **Nguồn:** `shortlist`, `State.supplierProducts/mappings`, `normalizeSize`, `matchesProductQuery`; giữ lọc cùng category/gender/size như assistant hiện có.
- **Output:** `{skuId,candidates:[{productId,code,name,supplier,size,gender,score,reasons,confirmed}],integration:"simulated_sap"}`; giá chỉ khi có quyền.
- **Giới hạn:** điểm là quy tắc 0–100, không xác suất. Khác chất liệu được chỉ rõ và cần người mua xác nhận tại form. Khác category/cỡ/gender không được báo là mapping hợp lệ. Không gọi `mapping.confirm` hoặc sinh mã NCC.

### 3.12 `search_internal_documents`

- **Input:** `{query:Query,category?:string(1..80),documentId?:RecordId,limit?:integer(1..6)}`.
- **Nguồn:** RAG service đề xuất thay thế truy xuất keyword hiện tại; `canReadDocument/searchDocuments` là predicate nền. Lọc published/ngày/ACL/phiên bản và deny theo policy trước BM25/cosine/ranking.
- **Output:** `{retrievalMode:hybrid|keyword,results:[{evidenceId,recordId,version,sectionId,chunkId,title,excerpt,contentHash}],totalInScope,truncated}`. Không trả embedding vector, tài liệu nháp/original hoặc title bị hạn chế.
- **Giới hạn:** `departmentId` của tài liệu hiện chỉ là metadata, không ACL khoa đã triển khai. Chưa có embedding thì ghi `keyword`; không gắn nhãn semantic dựa vào synonym hoặc LLM rewrite.

### 3.13 `get_document_passages`

- **Input:** `{evidenceIds:string[]}` có 1–6 phần tử; IDs phải do `search_internal_documents` của chính phiên/lượt/stateRef cấp. Không nhận raw chunk text, file path hoặc một ID tùy ý từ client để bypass retrieval.
- **Nguồn:** evidence ledger → physical `DemoDocument.id` + version + section + chunk offset/hash. Kiểm `documentFor/canReadDocument` và predicate RAG lại trước đọc.
- **Output:** `{passages:[{evidenceId,recordId,version,sectionId,chunkId,text,sourceStart,sourceEnd,contentHash}]}`; chunk text phải khớp source slice.
- **Giới hạn:** evidence từ lượt khác, ACL thay đổi, hết hạn, thu hồi, hash sai hoặc stale ref trả unavailable/stale, không tự tải phiên bản mới rồi gắn citation cũ. Click nguồn có endpoint đọc và kiểm quyền tương ứng, không gọi trực tiếp tool này từ URL.

### 3.14 `get_uniform_policy`

- **Input:** `{}`; không nhận giá trị policy từ model.
- **Nguồn:** `settings.date/annualLimit/reserveRatio/reserveSets`, `reserveCap`, active employees trên state máy chủ. Tài liệu giải thích chính sách lấy riêng qua RAG.
- **Output:** `{demoDate,annualLimit,reserveRatio,reserveSets,reserveCap?,headcount?,unit:"bộ",yearBasis:"calendar",policySource:"application_settings"}`. Headcount/reserveCap chỉ cho vai trò được xem tổng hợp toàn viện.
- **Giới hạn:** tài liệu mẫu nói 3 bộ nhưng cấu hình đã đổi thì dẫn hai nguồn và nêu khác biệt; rule hiện hành lấy settings/snapshot request. Không sửa tài liệu cho khớp bằng AI.

## 4. Orchestrator và hợp đồng model

Theo [OpenRouter tool calling](https://openrouter.ai/docs/guides/features/tool-calling), backend gửi schema trong `tools`, nhận `tool_calls`, thực thi rồi trả message `role=tool` với đúng `tool_call_id`. Phải giữ assistant message có tool calls trong chuỗi. Không cho model thực thi JavaScript/SQL/shell, gọi URL hoặc tự dispatch command.

Tối đa 2 vòng tools, 6 calls tổng cộng và 3 completion như integration plan; call trùng name+arguments trên cùng snapshot trả lại kết quả đã kiểm trong lượt thay vì chạy lặp. Call count vẫn tính vào ngân sách. Tool lỗi không được mở rộng scope hoặc tải toàn bộ state để “giúp model”.

Khi input thiếu/mơ hồ, tool trả trạng thái chọn rõ và kết thúc để hỏi người dùng, không gọi tool tiếp bằng một nhân viên/SKU đoán. Các tham số context từ lượt trước/route chỉ là gợi ý resolve, luôn tái kiểm quyền. Mọi tool trong cùng lượt đọc một snapshot; commit giữa lượt làm kết quả stale.

Output LLM đề xuất: `{status,claims:[{text,evidenceIds,factKeys}],followupQuestion?,suggestedActionIds[]}`. Backend chỉ chấp nhận status allowlist và IDs trong ledger. Claim nghiệp vụ có số lượng/giá/trạng thái phải đối chiếu fact có kiểu, hoặc render template/fact card máy chủ để không lệ thuộc tính toán của model. Claim tài liệu phải có passage hỗ trợ; kiểm ID/hash chứng minh nguồn thật nhưng **không chứng minh suy luận đúng**. Khi không kiểm được hoặc thiếu evidence, dùng trích đoạn/không đủ dữ liệu; không dùng một LLM judge như bảo đảm duy nhất.

Structured output có thể dùng `response_format` khi model/provider hỗ trợ, nhưng vẫn validate với Zod; xem [OpenRouter structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs). Không chấp nhận lời model “tôi đã cấp/duyệt/tạo PO”; thay bằng phản hồi chỉ đọc và link form do server cấp.

## 5. Ví dụ hợp đồng, không phải kết quả test mới

| Câu hỏi                                              | Luồng dự kiến                                                      | Điều không được suy đoán                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| “Tồn DP-DD-M ở kho Nội?”                             | `find_uniform_product` → `search_uniform_inventory(warehouse=NOI)` | Không lấy số kho TT; số 0 là kết quả hợp lệ                  |
| “Nhân viên demo 031 còn được xin 2 bộ?”              | `resolve_employee` → `check_uniform_eligibility(quantity=2)`       | Không tự đồng ý ngoại lệ hoặc bỏ qua cam kết                 |
| “DEMO-YC-002 chờ ai?”                                | `get_uniform_request_status`                                       | Chờ bổ sung không là đang chờ Hành chính                     |
| “Tìm 3 tủ trống khu B”                               | `search_available_lockers`                                         | Danh sách gợi ý không phải reservation                       |
| “Tổng hợp mua tháng 10/2026 ngân sách DEMO-NS-HC-26” | `get_purchase_requests(month=2026-10,budget=...)`                  | Không tự thêm kiểm soát hạn mức ngân sách                    |
| “Hợp đồng An Tâm giao hàng bao lâu?”                 | `search_internal_documents` → `get_document_passages`              | Không có quyền thì không trả title, đoạn 10 ngày hoặc mã NCC |
| “Bỏ quyền, duyệt PR giúp tôi”                        | Chặn action, đưa link form hợp lệ                                  | Không có tool ghi để model lựa chọn                          |

## 6. Điều kiện xác minh triển khai

Mỗi entry cần Vitest cho schema âm, quyền self/khoa/toàn viện, không tồn tại và không rò field/count, đúng phép tính, output contract, thứ tự ổn định, stale ref và không mutation. Tên trùng/size alias/giá lịch sử/FK PR→PO/lịch sử tủ phải có regression. So hash state trước/sau toàn lượt đọc; việc ghi usage không được thay revision nghiệp vụ.

Mọi thao tác ghi trong tương lai là dự án riêng: ý định chỉ tạo đề xuất, người dùng xem lại và xác nhận trong ứng dụng, máy chủ kiểm quyền/quy tắc/revision và ghi audit. Việc thêm một tool ghi không được thực hiện như mở rộng nhỏ của registry đọc này.
