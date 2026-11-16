# Kế hoạch triển khai và kiểm thử

Ngày 10/11/2026. **Tài liệu kế hoạch của prompt 1; không phải lệnh bắt đầu triển khai.** Chưa chạy lệnh cài đặt/khởi tạo dưới đây, chưa tạo ứng dụng, test hoặc seed và không thực hiện prompt tiếp theo. `proposal.md` là nguồn chức năng chính theo xác nhận của người dùng; không có `proposal.docx` trong repository.

Các tài liệu liên quan: [requirements.md](requirements.md) cho truy vết và AC; [architecture.md](architecture.md) cho trang, UI/UX, dịch vụ và AI; [data-model.md](data-model.md) cho quan hệ, trạng thái, seed và invariant.

## 1. Kết quả khảo sát môi trường đã thực hiện

| Hạng mục | Kết quả thực tế |
| --- | --- |
| Mã ứng dụng | Không có `src/`, `index.html`, `tsconfig`, router hay cấu hình Vite. Không có stack ứng dụng cần giữ; giữ package/lockfile và tài liệu hiện hữu. |
| Node / npm / Python | Đã chạy kiểm tra: Node v26.9.0, npm 12.2.0, Python 3.14.6; `npx` có tại `/usr/bin/npx`. |
| Dev dependencies trực tiếp | Đã chạy `npm ls --depth=0`: `@playwright/test` 1.65.0, Vitest 5.1.0, RTL 16.3.3, jest-dom 7.0.1, user-event 14.6.9, jsdom 31.0.0. |
| Gói gián tiếp đã thấy | Đọc manifest trong node_modules thấy React/React DOM 19.3.1 và Vite 8.3.7; chưa được khai báo là dependency trực tiếp nên không dựa vào sự hiện diện gián tiếp để build ứng dụng. |
| Gói còn thiếu | TypeScript, Tailwind, plugin Tailwind/Vite, React Router, Recharts, Lucide, Playwright CLI và UI primitives chưa được khai báo/cài đủ cho ứng dụng. |
| Cache browser | Thấy các thư mục `chromium-1243`, `chromium_headless_shell-1243`, `ffmpeg-1011` trong cache Playwright; chưa thực hiện launch hoặc kiểm tra tính tương thích. |
| Skills | Đã đọc đầy đủ `.agents/skills/ui-ux-pro-max/SKILL.md` và `.agents/skills/playwright/SKILL.md`, có scripts/references. UI/UX search chạy được bằng Python; prerequisite npx của Playwright đã đáp ứng. |
| Git | `git status --short` báo không phải Git repository ở môi trường cung cấp; không khẳng định có commit/diff/branch. |
| Dữ liệu nguồn | Đã đọc AGENTS, prompt 1, toàn bộ proposal.md; khảo sát bốn sheet workbook và thống kê cấu trúc/chất lượng. Không đưa dữ liệu cá nhân trong workbook vào đầu ra. |

Đọc manifest cho thấy Node hiện tại thỏa engine của Vite/Vitest/jsdom đang có. Điều này chỉ xác minh điều kiện package, không chứng minh toolchain chạy thành công. Việc có package Playwright không chứng minh browser executable đã sẵn sàng; cần kiểm tra launch khi có ứng dụng.

## 2. Thiết lập dự kiến khi bước triển khai được bắt đầu

Ưu tiên bổ sung ứng dụng **ngay tại root hiện tại**, giữ `package.json`, lockfile, proposal, workbook, skills và docs. Với repository đã có package, dùng cài Vite thủ công thay vì chạy scaffold vào thư mục không rỗng rồi cho công cụ ghi đè. Vite hỗ trợ cài trực tiếp vào project; với repository mới rỗng, preset thay thế là `npm create vite@latest ten-thu-muc-moi -- --template react-ts`. Không chạy preset này vào root hiện tại. Tham khảo [Vite Getting Started — Manual Installation](https://vite.dev/guide/#manual-installation).

Các lệnh sau là **đề xuất cho tương lai**, không được thực thi trong prompt 1:

```bash
# Từ root; khai báo trực tiếp các runtime dependencies cần dùng.
npm install --save-exact react react-dom react-router-dom lucide-react recharts
npm install --save-exact @radix-ui/react-dialog @radix-ui/react-alert-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs
npm install --save-exact zod

# Toolchain và styling; giữ các test dependencies đã có.
npm install -D --save-exact vite typescript @vitejs/plugin-react @types/react @types/react-dom @types/node
npm install -D --save-exact tailwindcss @tailwindcss/vite
npm install -D --save-exact @playwright/cli

# Nếu bổ sung coverage, phiên bản provider phải khớp Vitest hiện có.
npm install -D --save-exact @vitest/coverage-v8@5.1.0

# Kiểm tra lại dependency/peer sau cài; không dùng npm update toàn dự án.
npm ls --depth=0

# Sau khi có trang và cấu hình, cài browser project-local nếu máy chưa có.
npx playwright install chromium
```

Version runtime/toolchain được chốt bằng lockfile sau khi đối chiếu peer dependencies với các test package đã có; không mặc định rằng mọi phiên bản mới nhất tương thích. `--save-exact` tránh để các dependency mới trôi phiên bản. Không dùng global install, không tự thêm backend hoặc SDK tích hợp. Việc tải package/browser đòi mạng trong giai đoạn thiết lập; ứng dụng demo hoàn chỉnh không đòi mạng hoặc API ngoài để vận hành.

Tạo `index.html` với `lang="vi"`, viewport cho phép zoom; `src/main.tsx`; cấu hình TypeScript strict; Vite có plugin React và Tailwind. CSS gốc dùng `@import "tailwindcss";` và token semantic từ architecture. Cách tích hợp plugin và CSS theo [Tailwind — Using Vite](https://tailwindcss.com/docs/installation/using-vite). Chọn Radix + components nội bộ tương đương shadcn để chủ động token và trạng thái, tránh bước generator làm thay đổi file không kiểm soát. Không tải font/ảnh từ CDN khi chạy demo.

Khai báo scripts dự kiến: `dev` = `vite`; `typecheck` = `tsc -b --pretty false`; `build` = `tsc -b && vite build`; `preview` = `vite preview`; `test` = `vitest run`; `test:watch` = `vitest`; `test:coverage` = `vitest run --coverage`; `browser` = `playwright-cli`. Đây là nội dung cần tạo ở bước triển khai, các script này **chưa tồn tại** trong package hiện tại. Tham khảo cách cài/chạy từ project tại [Vitest Getting Started](https://vitest.dev/guide/).

Cấu hình test dự kiến: domain/services/assistant chạy environment node; components chạy jsdom, import `@testing-library/jest-dom/vitest` và cleanup, clock/seed reset mỗi case. Custom `renderWithDemo` bọc store/router/tài khoản, mỗi test có store riêng; theo mô hình wrapper tại [React Testing Library Setup](https://testing-library.com/docs/react-testing-library/setup/). Giới hạn test include để không nhặt file E2E; artifacts dưới `coverage/` và `output/playwright/`, không lưu lẫn dữ liệu demo vào nguồn.

## 3. Mốc triển khai dự kiến trong 5 tuần

Ước lượng 25 ngày làm việc, điều chỉnh theo kết quả mốc trước. M0 là công việc lập kế hoạch hiện tại, không được dùng để suy ra đã triển khai các mốc sau. M2/M3 là hai cổng P0; không giảm chiều sâu hai phân hệ này để thêm chức năng nâng cao ở M4/M5.

| Mốc | Thời gian | Đầu ra dự kiến | Điều kiện kết thúc / phụ thuộc |
| --- | --- | --- | --- |
| M0 — Lập kế hoạch | Prompt 1 hiện tại | Bốn docs, nguồn đã xác nhận, requirement/assumption/AC, trang, model, AI và chiến lược kiểm thử | Rà soát đủ nội dung prompt 1; không code ứng dụng, không prompt 2–5. |
| M1 — Nền tảng dùng chung | Ngày 1–4 | Cấu hình stack/test; shell tiếng Việt, token responsive; account switching và role scope; seed tổng hợp, clock; schema/localStorage/transaction/audit; form/table/dialog dùng chung | Refresh/reset/error storage hoạt động; invariant seed; mẫu form dùng keyboard được; unit/service tests persistence và quyền. |
| M2 — Đồng phục P0 | Ngày 5–10 | Category/SKU/cỡ/eligibility, kho/lô/ledger; định mức/cam kết; yêu cầu/khoa, hai bước duyệt, giữ/bàn giao/hủy/trả; hồ sơ nhân viên, báo cáo CSV | AC-03…08, AC-25; cấp 1 khi đã 2, chặn vượt, không âm/trùng kho, giữ/hủy đúng, giá lịch sử bất biến; Playwright luồng cấp và hủy. Phụ thuộc M1. |
| M3 — Tài liệu P0 và nền trợ lý | Ngày 11–16 | Ít nhất 5 loại tài liệu có nội dung; nhập/cập nhật/PII/rà soát/ACL/xuất bản; tìm/reader/citation/ký/thu hồi/index; intent/router và trả lời có nguồn | AC-13…17, AC-20/21; gọi service trái quyền bị chặn; nguồn cũ/ACL mất quyền không rò trong chat. Playwright từ nhập đến citation/thu hồi. Phụ thuộc M1, dùng chính sách M2 cho ví dụ. |
| M4 — Mua sắm tích hợp | Ngày 17–20 | Tổng hợp thiếu từ M2; danh mục/mapping NCC; PR/dự trữ/duyệt ba bên; MockSapAdapter; PO, retry và nhận từng phần | AC-07/09…12/26; PR ≠ PO ≠ receipt; 48/49, mapping xác nhận, retry không nhân đôi, nhận 6+4; Playwright thiếu → mua → nhập → cấp. Phụ thuộc M1/M2 và assistant foundation M3. |
| M5 — Tủ đồ | Ngày 21–22 | CRUD/tình trạng/sở hữu; lọc trống, preview/allocation xác định; giao người/đơn vị, chuyển/trả/thu hồi, lịch sử; intent tủ | AC-18/19; không tủ lỗi/trùng, không tự cấp một phần; Playwright cả chu kỳ. Phụ thuộc M1/M3. |
| M6 — Tích hợp và hoàn thiện trình diễn | Ngày 23–25 | Toàn bộ intent/evidence, dashboard tính từ state; hồ sơ/quyền đồng bộ giữa module, responsive/accessibility; kịch bản demo; kiểm thử và artifacts thật | Toàn bộ AC, kiểm tra build/types/test, E2E, screenshot và lỗi; ghi rõ kết quả chạy/chưa chạy. Không nút giả, network nghiệp vụ không gọi ngoài, dữ liệu tổng hợp hoàn toàn. |

Với mỗi mốc triển khai: kiểm tra logic quan trọng trước, thực hiện UI qua service chung, chạy Vitest liên quan, chạy browser hành trình vừa thay đổi, sửa lỗi rồi lưu bằng chứng. Chỉ mở rộng/rerun kiểm thử khi thay đổi hoặc kết quả mới đòi hỏi, không chạy toàn bộ lặp lại vô ích. Nếu tiến độ căng, bỏ sơ đồ tủ nâng cao, hiệu ứng, format parser bổ sung hoặc chart phụ; giữ đủ workflow P0 và đường đi chức năng P1 đã nêu.

## 4. Chiến lược Vitest — logic và dịch vụ

Test ưu tiên hành vi/quy tắc có rủi ro, không viết test chỉ để kiểm một phép gán hoặc CSS token. Mỗi case dựng fixture nhỏ nhất, clock cố định, actor rõ và kiểm cả state/ledger/audit sau thành công hoặc không đổi sau lỗi. Khai báo bảng test cho biên thay vì copy nhiều implementation expectation. Mục tiêu coverage cho domain/services/assistant ít nhất 90% lines và 85% branches, nhưng mọi invariant/AC trọng yếu vẫn phải có test dù đạt tỷ lệ.

| Nhóm | Case phải tự động hóa |
| --- | --- |
| Định mức | 0/1/2/3/4 bộ; số âm/thập phân; nhiều dòng cùng người; issued+commitments; gửi lại loại trừ chính mình; hủy/từ chối giải phóng; trả hàng không tự hoàn quota; năm dương lịch theo timezone; active/chức danh/khoa đổi; hạn mức version cũ/mới. |
| Kho và giá | nháp/gửi/duyệt đầu không đổi kho; duyệt cuối reserve toàn bộ; FIFO ổn định; nhiều lô khác giá; hủy chỉ release một lần; bàn giao stock/reserve cùng giao dịch; tồn không âm; sửa currentPrice không đổi history/report; trả tốt/hỏng đúng xử lý. |
| Approvals | snapshot luồng; thiếu stage, sai role/khoa, self-approval, dùng một actor nhiều stage, từ chối thiếu lý do, quyết định lặp, gửi lại vòng mới, stage cuối mất tồn không commit một phần. |
| Mua dự trữ/thiếu | headcount là employee active, không account/role count; 120→48, 123→49, 0→0; nhiều dòng vượt trần, configurable ratio; shortage có nguồn, không mua trùng; đã nhận không bị trừ hai lần; hủy PR giải phóng đúng liên kết. |
| Mapping/adapter/nhận | khớp hoàn toàn/gần/không có; khác specs cần xác nhận; catalog đổi mất xác nhận; dòng khác NCC của PR bị chặn; tạo PO thiếu duyệt; lỗi và retry cùng operationId; input khác cùng ID; nhận 6/4/5 vượt; double-submit receipt, không stock update ở tạo PR/PO. |
| Document retrieval | chưa review không index; original/PII không ở sanitized chunk; reviewed hash thay đổi; published/effective/expired/revoked; ACL đọc/ký độc lập; getById/search/chunk/export đều áp quyền; phiên bản mới loại nguồn cũ; citation cũ không truy xuất lại. |
| Tủ đồ | mã trùng theo phòng/dãy/số; inactive/hỏng/đang dùng không chọn; quyền khu; đủ/thiếu; preview không ghi; thay state giữa preview/confirm; cấp người/đơn vị; một tủ/người; chuyển/trả/thu hồi idempotent; ownership không đổi ngầm. |
| Persistence | schema/hydration/migration; JSON hỏng, unsupported schema; quota setItem lỗi; all-or-nothing state+audit+ledger; revision conflict; operation replay; rebuild selectors từ ledger/index. |
| Trợ lý | intents tiếng Việt có/không dấu, entity resolution, tie/clarify, unsupported, synonyms theo từ điển; câu hỏi thiếu thông tin; trạng thái/lỗi grounded; ranking ổn định; không lấy nguồn trái quyền; không gọi command mutation; tài liệu có câu ra lệnh không đổi routing/quyền. |

Không mocking lại hàm nghiệp vụ đang được test. Mock chỉ clock, ID counter, storage fail và adapter scenario ở ranh giới; test adapter riêng có dữ liệu thực tế của mock. Test truy xuất trái quyền phải gọi dịch vụ trực tiếp, không chỉ xác nhận UI đã ẩn nút. Không dùng ảnh chụp làm bằng chứng cho trần định mức hoặc tính nguyên tử.

## 5. Chiến lược Vitest + React Testing Library

Sử dụng `screen.getByRole`, `getByLabelText`, `userEvent`, `findBy...` cho chờ trạng thái; kiểm tra hành vi nhìn thấy và tên truy cập được bằng tiếng Việt, không assert cấu trúc reducer/class CSS. Harness giữ cùng instance store qua route để kiểm liên kết nhưng reset giữa case.

- Form yêu cầu: chọn nhân viên → loại/cỡ hợp lệ, giới hạn và lỗi cạnh trường; submit thiếu thông tin đưa focus ErrorSummary, liên kết quay đúng input; sửa giữ dữ liệu, hủy xác nhận không ghi.
- Approvals: tài khoản hiện tại chỉ xử lý được bước đúng; reason bắt buộc khi từ chối, loading chống gửi đôi; trạng thái và timeline đổi sau service commit thành công.
- Reader/ingestion: không có kết quả/chưa đủ quyền/file không hỗ trợ; redaction preview, bắt buộc rà soát; citation mở đúng mục; ký theo phiên bản; đổi quyền/thu hồi cập nhật vùng đang mở.
- Mua/receipt: phân biệt lượng thiếu/dự trữ, đối sánh chưa xác nhận, công thức reserve, lỗi nhận vượt còn lại và lỗi adapter/lưu trữ có đường sửa/thử lại.
- Locker: bảng tình trạng, yêu cầu số lượng, preview, thiếu tủ, confirm/reclaim với lý do; UI cập nhật số trống từ selector.
- Assistant: hỏi rõ, không dữ liệu, evidence link, lỗi quyền, gợi ý điền form; đổi account xóa hội thoại cũ, query không tự duyệt.
- Components quan trọng: focus trap/return focus, Escape, label/aria-describedby, trạng thái live có đủ ngữ cảnh, bảng sortable và bộ lọc có thể dùng bàn phím. Không viết test riêng cho mỗi badge chỉ lặp lại props.

## 6. Chiến lược Playwright và bằng chứng trình duyệt

Đã đọc skill Playwright và tham khảo CLI/workflow cục bộ. Browser verification dùng **CLI-first**, snapshot trước tương tác và lấy ref mới sau điều hướng/thay DOM. Cài CLI ở project local khi triển khai để tránh phụ thuộc global; wrapper sẵn có dùng được khi CLI chưa có nhưng có thể phải tải package. Không chạy browser ở prompt 1 vì chưa có trang cần xác minh, không viết E2E specs ở giai đoạn kế hoạch.

Chuỗi lệnh minh họa sau khi có ứng dụng, **chưa thực thi**:

```bash
# Terminal chạy ứng dụng tại root.
npm run dev -- --host 127.0.0.1

# Terminal riêng: giữ artifacts trong thư mục được skill quy định.
mkdir -p output/playwright/p0-cap-phat
cd output/playwright/p0-cap-phat
../../../node_modules/.bin/playwright-cli --session asa-p0 open http://127.0.0.1:5173 --headed
../../../node_modules/.bin/playwright-cli --session asa-p0 snapshot
../../../node_modules/.bin/playwright-cli --session asa-p0 tracing-start

# Lấy refs từ snapshot vừa nhận rồi fill/click/select/press.
# Không dán ref mẫu vào script khi chưa có snapshot thực.

../../../node_modules/.bin/playwright-cli --session asa-p0 screenshot
../../../node_modules/.bin/playwright-cli --session asa-p0 tracing-stop
../../../node_modules/.bin/playwright-cli --session asa-p0 console warning
../../../node_modules/.bin/playwright-cli --session asa-p0 network
../../../node_modules/.bin/playwright-cli --session asa-p0 close
```

Wrapper thay thế nằm tại `.agents/skills/playwright/scripts/playwright_cli.sh`, đã xác minh script dùng npx và `@playwright/cli`; không thay CODEX_HOME/HOME. Kịch bản tự động phải có setup fixture, chuỗi thao tác và assertion trạng thái/bằng chứng xác định; không chỉ ghi ảnh sau click. Refs của CLI là tạm thời: mỗi replay đọc snapshot và tìm lại ref qua nhãn, không giữ ref cũ qua lần chạy. Nếu bước triển khai yêu cầu test files, dùng `@playwright/test` đã có cho bộ hồi quy bằng `getByRole`/`getByLabel` và assertions trên UI, giữ CLI cho kiểm tra tương tác/ảnh; hiện chỉ định nghĩa các hành trình cần tự động hóa bên dưới, không tạo hoặc chạy test files.

Mỗi hành trình chạy trên seed/reset riêng, đổi tài khoản bằng UI để duyệt nhiều bên, không dùng DevTools sửa status để vượt workflow. Assert số trước/sau, ID/timeline/nguồn, refresh để kiểm persistence. Có thể đọc localStorage để đối chiếu invariant sau luồng, nhưng kết quả nghiệp vụ chính phải được kiểm trên UI. Dùng wait theo trạng thái/locator, không timeout ngủ cố định. Chụp khi thành công và khi gặp lỗi; trace giúp đọc lại luồng, không suy ra “pass” từ việc mở được browser.

### Hành trình bắt buộc tự động hóa

| Journey | Thiết lập và thao tác | Assertion chính / AC |
| --- | --- | --- |
| J01 — Cấp phát đầy đủ | NV-001 đã 2 bộ → điều phối xin 1 → trưởng khoa → hành chính → thủ kho bàn giao → refresh | đúng các bước, tồn khả dụng giảm ở duyệt cuối, lịch sử 3 bộ/giá lô, KPI đồng bộ; AC-01/03/04/06 |
| J02 — Vượt định mức và sai loại | xin 2 khi đã 2, tạo thêm yêu cầu khi có cam kết, chọn loại không hợp lệ | lỗi có số liệu/cách sửa, không tạo stock/issuance; AC-04/25 |
| J03 — Giữ và hủy | fixture 10 vật lý/2 giữ → duyệt thêm 3 → hủy; gửi lặp | 10/5/5 rồi 10/2/8, một audit mỗi thao tác, refresh không mất; AC-05/22 |
| J04 — Thiếu đến mua và cấp | bác sĩ XL thiếu 2 → gom mua → mapping → 3 người duyệt → PO giả → nhận → gửi lại và cấp | PR/PO/receipt riêng, không mua trùng, không auto-approve/âm kho; AC-07/26 |
| J05 — Trần dự trữ | 120 active, lập 48 rồi sửa thành 49/đa dòng | 48 gửi được, 49 bị chặn và giải thích công thức; AC-09 |
| J06 — Đối sánh cần người xác nhận | gợi ý khác thông số → thử gửi → xác nhận/lý do → gửi | không dùng suggestion chưa xác nhận; mã/source hiện rõ; AC-10 |
| J07 — SAP lỗi và retry | approved PR, scenario tạo PO thất bại → retry với cùng operation | không có PO khi lỗi, thành công đúng một DEMO-SAP-PO, không network SAP/kho đổi; AC-11 |
| J08 — Nhận một phần | PO10 → nhận6 → thử5 → nhận4 → refresh/lặp | đúng còn4 sau lần đầu, vượt bị chặn, chỉ cộng tổng10; AC-12 |
| J09 — Tìm và trích dẫn | tìm quy định định mức rồi hỏi trợ lý có/không dấu → mở citation | đoạn thật, phiên bản/mục khớp, không suy đoán ngoài nội dung; AC-13/20 |
| J10 — Quyền và vòng đời tài liệu | tài khoản thường hỏi hợp đồng/URL trực tiếp; người có quyền xem → đổi ACL/phiên bản/thu hồi | không snippet/nguồn trái quyền, chat/reader/citation cũ mất hiệu lực; AC-02/14/16 |
| J11 — Nhập/rà soát/ký | TXT demo có PII giả → che/loại → review → ACL/ký → publish → đúng người ký → bản mới | trước review không retrieval; dữ liệu sau che; ký đúng quyền/version, không nhân đôi; AC-15/17 |
| J12 — Chu kỳ tủ | CRUD tủ mới, tìm3, thử thiếu/đang dùng/lỗi, phân bổ → chuyển → trả/thu hồi → refresh | đúng số trống, owner và lịch sử, không giao trùng, không tự cấp một phần; AC-18/19 |
| J13 — Trợ lý và xác nhận | hỏi tồn/lịch sử/tủ/mã NCC/trạng thái/lỗi; yêu cầu “duyệt giúp”; hỏi ngoài phạm vi | record evidence khớp bảng, chỉ mở form khi cần, không đổi state từ chat, fallback rõ; AC-20/21 |
| J14 — Báo cáo và master data | lọc khoa/SKU/cỡ, xuất CSV, đổi giá hiện tại; tạo account/role cho nhân viên có sẵn | CSV/report khớp lịch sử, giá cũ không đổi, headcount không tăng vì account/role; AC-08/09 |
| J15 — Persistence và phục hồi | hoàn tất thao tác rồi reload; inject storage JSON hỏng/quota lỗi trong fixture kỹ thuật; reset có xác nhận | lưu thật hoặc báo lỗi và giữ state cũ, không auto-xóa, hủy reset không đổi; AC-01/22 |
| J16 — Giao diện và offline | dùng keyboard, zoom, viewport, reduced-motion; kiểm network và dữ liệu demo | tiếng Việt, không tràn trang/focus bị che/nút chết, không request SAP/LLM/font CDN; AC-23/24 |

### Responsive, screenshot và độ trung thực kết quả

Chạy Chromium tối thiểu tại 375×812, 812×375, 768×1024, 1440×900. Chụp tổng quan, form đồng phục có lỗi, timeline duyệt, kết quả/reader có citation, màn redaction, PO/receipt và bảng/phân bổ tủ. Ảnh dưới `output/playwright/<journey>/`, ghi viewport, seedVersion, ngày demo và vai trò. Dữ liệu/số liệu được cố định trước chụp, không ép baseline chứa ID/thời gian ngẫu nhiên. Nếu chạy được thêm Firefox/WebKit thì ghi kết quả riêng, không coi chúng đã được kiểm chỉ vì Chromium thành công.

Kiểm bàn phím toàn bộ hành động chính, focus khi mở/đóng modal và đổi route, focus không bị sticky che, zoom 200%, tên truy cập và thứ tự đọc, trạng thái không chỉ màu; chart có bảng thay thế. Reduced motion không chặn logic. Console không có lỗi bất ngờ; network không có request nghiệp vụ ngoài localhost (bỏ qua kết nối HMR local). Không tự nhận định bảo mật thật từ các test quyền client.

## 7. Kịch bản demo trình bày và điều kiện bàn giao

Demo dự kiến 10–15 phút: mở tổng quan có nhãn mô phỏng → cấp thêm một bộ cho người đã có hai và giải thích giới hạn → duyệt/giữ/bàn giao, chứng minh số liệu sau refresh → tra tài liệu và dẫn nguồn, thử nội dung trái quyền → minh họa nhập/rà soát/thu hồi → nhu cầu thiếu sang mua/nhận → phân bổ và trả tủ. Chuẩn bị các tài khoản hợp lệ và fixtures để không phải bỏ qua vòng duyệt trong buổi trình bày.

Checklist cuối giai đoạn triển khai:

- Tất cả requirement ID có màn hình/service/test liên quan; AC P0 đạt trước tinh chỉnh chức năng phụ.
- `npm run typecheck`, `npm run build`, `npm run test` và coverage đã thực thi và có kết quả thực tế. Browser journeys quan trọng đã chạy; sửa lỗi thì chạy lại đúng phạm vi ảnh hưởng.
- Không số thống kê hardcode độc lập, không nút không hành vi, form có validate, state và audit đồng bộ; mọi external integration là giả lập được ghi rõ.
- Chỉ dữ liệu tổng hợp, không nội dung nhận dạng lấy từ workbook, không credential hay API thật. Tài liệu và assistant cite nguồn demo hiện hành; UI không gọi mock RBAC là bảo mật sản xuất.
- Có hướng dẫn khởi động/reset/chọn tài khoản, phạm vi giả lập và lỗi đã biết. Ghi cụ thể test nào chạy/pass/fail/not run, môi trường và đường dẫn artifact; không nói “đã pass” nếu chỉ lập test plan.

## 8. Rủi ro, giả định và cách xử lý

| Vấn đề | Cách xử lý trong kế hoạch |
| --- | --- |
| Không có DOCX | Người dùng đã xác nhận dùng proposal.md; đây là cơ sở chính. Có bản khác sau này thì lập đối chiếu trước thay phạm vi, không giả nhận đã đọc. |
| Hiểu khác về “trừ kho khi duyệt” | Hiển thị riêng vật lý/giữ/khả dụng, giảm khả dụng ngay lúc duyệt cuối; giữ/hủy nguyên tử. Công thức và AC-05/06 là thỏa thuận thiết kế cần giữ nhất quán. |
| “3 bộ/năm”, “40%/lần” chưa chi tiết | Các giả định A01–A08 công khai và configurable, có biên kiểm thử. Không tự thêm hạn mức năm cho dự trữ hoặc tự miễn trừ qua AI. |
| Workbook có thể chứa thông tin thật | Chỉ dùng cấu trúc/tình trạng, tạo lại tên/mã và assignment; không import file vào app hoặc gửi nội dung ra dịch vụ. |
| LocalStorage/quyền client | Transaction envelope và role service dùng cho tính đúng của demo; giới hạn nhiều tab/quota và thiếu bảo mật máy chủ được nêu rõ. |
| Khó trích xuất/nhận diện PII | TXT/MD thực, PDF/DOCX mẫu mô phỏng, regex + review thủ công; không giả tuyên bố OCR hay phát hiện đầy đủ. |
| Tìm theo nghĩa không là LLM thật | Từ điển/scores/template xác định, evidence thật; mơ hồ hỏi lại, không có chứng cứ trả thiếu dữ liệu. |
| Package/browser chưa đủ hoặc môi trường không có mạng | Giữ dependency đã có, cài local và pin khi triển khai; báo bước không thực hiện được, không che bằng tuyên bố test pass. |
| Tiến độ P1 lấn P0 | Cổng M2/M3 bắt buộc; P1 chỉ chiều sâu tối thiểu nêu trong requirements, không thêm mua sắm/tủ nâng cao. |

## 9. Trạng thái xác minh của lần lập kế hoạch này

Đã thực hiện: đọc các nguồn hiện có và hai skill, kiểm tra môi trường/dependency, truy vấn UI/UX cục bộ, tính tương phản các cặp màu thiết kế, khảo sát workbook không sao chép danh tính, viết và rà soát bốn tài liệu. Script kiểm tra tài liệu đã xác nhận đủ 4 file, 33 requirement ID duy nhất, 17 giả định, 26 AC liên tiếp, 16 hành trình, 11 liên kết local hợp lệ, code fence đóng đủ và không có mục chờ bổ sung. Kiểm tra SHA-256 xác nhận AGENTS, proposal.md, package/lockfile, workbook, skills-lock và prompt1 không thay đổi. Đây là kiểm tra tài liệu/đầu vào, không là test ứng dụng.

**Chưa chạy** Vitest/RTL, build/typecheck hoặc browser workflow Playwright vì chưa có ứng dụng, cấu hình hay test dự án. Không khởi tạo, cài thêm dependency hoặc thực hiện prompt sau trong lần này.
