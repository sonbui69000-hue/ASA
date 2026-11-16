# Dữ liệu workbook trong workspace cục bộ

Ngày 11/11/2026. Người dùng đã chọn giữ bản ghi nguồn tại máy và **chặn OpenRouter cho workspace**. Ngoại lệ được ghi ở `AGENTS.md`; seed và automated tests vẫn synthetic. Báo cáo này không chứa tên/mã/bản ghi cá nhân.

## Kết quả nhập thực tế

Đã đọc `uniform_manage.xlsx` và `locker_management_file.xlsx` (file tủ hiện có tương ứng “locker_manage”) bằng Python standard library ZIP/Open XML. Không cài dependency, không tải dữ liệu lên dịch vụ ngoài. Đã kiểm SHA-256 metadata khớp hai file gốc.

| Collection trong `State.workbookData`        |   Số dòng |
| -------------------------------------------- | --------: |
| `uniformRequests`: yêu cầu/lịch sử cấp phát  |   **273** |
| `uniformPurchases`: tổng hợp mua/ngân sách   |    **54** |
| `lockers`: danh sách cấp/thu tủ của ba sheet | **1.753** |
| `lockerFaults`: hai khối danh sách lỗi       |    **26** |

Commit lúc **2026-11-11T04:21:39.078209+00:00**, revision sau nhập **15**. Dữ liệu đã nằm trong canonical store **`.local/online/state.json`**, không chỉ là file export. Nhập lại cùng workbook đã thực thi và xác nhận idempotent: không thêm rows/revision/audit/backup. Reload repository xác nhận policy vẫn chặn; local assistant lookup trả đúng source IDs và links ở cả ba phân hệ.

Giữ tên/mã nguồn, khoa/chức danh/giới tính, loại/cỡ, lượng yêu cầu/cấp, ngày, PR/PO/mã hàng/tên hàng, đơn vị/giá trị mua/ngân sách, phòng/dãy/nhãn tủ, ghi chú, sheet và số dòng. ID `XLS-<nhóm>-<sheet>-<row>` chỉ phục vụ liên kết ứng dụng; mã nguồn vẫn nguyên vẹn. Có 190 mã nhân viên khác nhau trong nhật ký đồng phục. Không ghép người từ workbook tủ bằng tên.

Không nạp cột điện thoại riêng (schema nghiệp vụ hiện tại không dùng), cột phụ không có tiêu đề, sheet trống hoặc biểu mẫu trống. Ghi chú nguồn được giữ nguyên trong vùng cục bộ riêng tư. Ô trống không bị đổi thành 0; giữ raw value cạnh giá trị đã đọc. Không thực thi/tính lại công thức Excel, chỉ dùng cached values và gắn lưu ý.

## Cách xem

```bash
npm run build
npm run server
# Mở http://127.0.0.1:8080 trên máy cho phép localhost
```

Đăng nhập account quản lý đã cấp credential: `hc`, `warehouse`, `buyer`, `finance`, `leader` hoặc `system`. Không chia sẻ `.env` hoặc access-code file trên màn hình.

- **Đồng phục → Dữ liệu Excel**: `/dong-phuc/du-lieu-excel`.
- **Mua sắm → Dữ liệu Excel**: `/mua-sam/du-lieu-excel`.
- **Tủ đồ → Dữ liệu Excel**: `/tu-do?view=excel`; có danh sách tủ và danh sách lỗi.

Bảng có tìm theo tên/mã/khoa/vị trí/PR/PO, lọc dòng cần rà soát và nút xem chi tiết kèm vị trí nguồn. Điều hướng chính ưu tiên tab nguồn cho account được phép. Trợ lý cục bộ hỗ trợ tên đầy đủ, mã nguồn hoặc ID dòng: “Lịch sử Excel [mã nhân viên]”, “Tủ Excel [tên đầy đủ]”, “Mua Excel [mã hàng]”. Source link mở đúng dòng; không gửi câu hỏi ra ngoài.

**Origin offline 5173/4173 vẫn dùng localStorage riêng.** Không ghi ngầm dữ liệu thật vào browser storage hoặc bundle offline. Dùng bản online 8080, hoặc online dev 5174 với backend đang chạy, để xem bộ vừa nhập.

## Dữ liệu nguồn và nghiệp vụ hiện hành

Các dòng được nạp thành **nhật ký nguồn chỉ đọc** trong cùng State. Không đủ bằng chứng để biến chúng thành chứng từ đã duyệt, số dư tồn kho mở đầu, lô giá lịch sử hoặc assignment tủ hiện tại. Các tab nghiệp vụ cũ vẫn là giao dịch đã được xác nhận riêng; UI có thông báo phân biệt.

Đối chiếu thực tế với backup xác nhận employees/accounts/SKU/lots/movements/requests/issuances/purchases/orders/receipts/documents/lockers/events/settings hiện có **không đổi**. Không gộp số nguồn với seed thành KPI vận hành hoặc giả phê duyệt/nhận hàng.

Những điều cần rà soát đã đo:

- 24 dòng đồng phục có cỡ trống/ghép; giữ `sizeRaw`, không chọn biến thể tự động. 19 dòng khác có công thức và được đánh dấu cached value.
- 54 dòng mua có cached formula values; 27 dòng có đơn vị không phải bộ hoặc chưa rõ. Không quy đổi cái/đôi thành bộ.
- Cả 1.753 dòng tủ thiếu mã nhân viên; 1.562 dòng chưa xác định ngày cấp, gồm ô trống/ngày thiếu năm. 40 dòng có nhiều người trong một ô; 30 giá trị ngày thu hồi không đủ căn cứ chuẩn hóa. Không coi người sử dụng trống là tủ sẵn sàng cấp.
- 26 dòng lỗi cần xác minh vị trí/tình trạng; không ghép vào tủ chỉ bằng số, không tự tạo nghiệp vụ bảo trì.

Số dòng có lưu ý: **43** uniform, **54** purchasing, **1.753** locker, **26** fault. Tất cả vẫn được nạp và đọc được; flags không có nghĩa dữ liệu bị bỏ. Đưa nguồn này vào ledger/workflow vận hành cần rà soát trường thiếu và lập giao dịch đúng business rules.

## Chặn API AI, quyền đọc và lưu trữ

Envelope lưu `externalAiBlocked: true`; State còn `workbookData` cũng tự bị chặn kể cả thiếu flag envelope. Assistant trả **`AI_LOCAL_ONLY` trước capability metadata và completion**. CLI smoke cũng kiểm policy trước network; đã thực thi guard và nhận **blocked, 0 metadata, 0 completion**. Reset/import synthetic giữ cờ chặn; không tự bật lại API. `.env` và tên/giá trị `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` giữ nguyên.

`projectView` chỉ trả source data cho các role quản lý nêu trên. Employee/coordinator/head/documents không nhận rows hoặc counts vì chưa xác minh mapping danh tính/khoa. DTO chỉ mang flag chặn chung. Không thêm imported contents vào online localStorage cache. File state/backup/staging có quyền 0600, thư mục riêng 0700 và ngoài static root; Vite từ chối `.local`, `.env`, XLS/XLSX.

Accounts/credentials/RBAC vẫn là prototype, không phải SSO hoặc bảo mật production. Người có quyền OS có thể đọc/sửa file. Không dùng dữ liệu này làm chứng nhận phân quyền bệnh viện.

## Nhập lại và backup

Dừng server trước khi nhập. Backend/CLI mới dùng `.local/online/.writer-lock` chống hai writer; CLI còn kiểm listener legacy cổng 8080 trên Linux. Khóa còn sau crash cần operator kiểm PID/process trước khi gỡ, không tự xóa lock của process đang hoạt động.

```bash
npm run import:workbooks -- --confirm-local-data
# Hoặc đường dẫn khác:
npm run import:workbooks -- --confirm-local-data --uniform /path/uniform.xlsx --lockers /path/locker.xlsx
```

Cùng fingerprint/cùng parsed contents: no-op. Workbook thay đổi: thay bộ nguồn, không append trùng. Cùng fingerprint nhưng parsed contents khác: từ chối để rà soát thay đổi reader. Schema/ID duy nhất/size limit được kiểm trước atomic commit; lỗi ghi không publish State mới.

Backup trước commit đầu: **`.local/online/state.json.before-workbook-d9af07d4-ee8e-4318-a29a-c7016fa18a4b.json`**, quyền 0600. Nhập lại không ghi đè backup này. Summary không có bản ghi cá nhân ở `output/qa/workbook-import-summary.json`; staging có nội dung nguồn chỉ ở `.local/imports/`, không đưa vào Git/public artifacts.

Khôi phục bằng operator: dừng backend, sao lưu state hiện tại, kiểm bản trước rồi phục hồi file mong muốn. Backup trước import là workspace synthetic; không dùng để lặng lẽ bật external AI cho dữ liệu thật. UI reset xóa dữ liệu nhập và thay đổi khi đã xác nhận nhưng vẫn giữ AI bị chặn.

## Kết quả kiểm chứng

Full QA **2026-11-11T04:25:38.085Z–04:26:25.340Z**: **338 Vitest/RTL tests pass, 0 fail/skip**, typecheck và cả ba production builds pass. Bao gồm 12 tests mới cho import, policy, backup/idempotence, ACL, source lookup/UI; một ca chạy thêm **4 Python reader tests** trên XLSX synthetic tự tạo. Không dùng workbook thật trong tests hoặc screenshot.

Playwright: 52 offline + 20 online đăng ký; cả hai webServer bị chặn, **72 chưa thực thi, 0 screenshot**. QA overall **incomplete / exit 1**; không tuyên bố browser pass. UI/UX Pro Max table guidance và Playwright skill đã được dùng; vẫn cần chạy browser trên host phù hợp.

Exact-key scan sau import: zero matches trong source/docs/builds/reports, `.env` hash giữ nguyên. Quét 1.480 giá trị tên nguồn dài ít nhất 8 ký tự qua 192 source/build/report files: **0 public files khớp**, không in tên. Đây là kiểm tra phạm vi cụ thể, không chứng nhận mọi dạng PII. Git index/history vẫn chưa xác minh vì workspace không có repository hoạt động.
