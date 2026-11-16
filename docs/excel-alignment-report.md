# Đối chiếu Excel — phase 4.5

> Báo cáo và số liệu kiểm tra này chốt tại phase 4.5. Thay đổi trình diễn và kiểm chứng mới nhất ở [demo-verification.md](demo-verification.md), dữ liệu seed mới ở [demo-data.md](demo-data.md).

Đã phân tích cục bộ `uniform_manage.xlsx` bằng Python standard library (ZIP/Open XML); không tải workbook lên dịch vụ ngoài, không nhập dòng thật vào ứng dụng. Nguồn chức năng ưu tiên: AGENTS.md → proposal.md → cấu trúc workbook → ứng dụng → kế hoạch phase 1. Báo cáo/kế hoạch này được tạo **trước khi sửa mã ứng dụng**. Không triển khai prompt 5.

## 1. Tổng quan và phương pháp

Workbook có 4 worksheet, đều visible, không có external link. Dùng bí danh S01–S04 theo thứ tự workbook để không phổ biến nhãn nguồn nội bộ. Không ghi tên/mã nhân viên, mã hàng thật, tên nhà cung cấp, giá, số chứng từ hoặc dòng giao dịch thật. Các địa chỉ ô, tên trường chung, kiểu dữ liệu, dạng công thức và danh sách nhãn cỡ là bằng chứng cấu trúc.

Đã đọc sheetData, sharedStrings, styles, shared formulas, cached values, merges, autoFilter, definedNames, dataValidations, conditionalFormatting và thuộc tính ẩn/protection của cả 4 sheet. Không chạy macro hoặc tính lại công thức. Cache không phải bằng chứng tính đúng của nghiệp vụ. Những ô dữ liệu có dạng giống tiêu đề được loại khỏi đầu ra; chỉ lấy hàng tiêu đề đã xác định.

## 2. Worksheet và trường quan sát được

| Sheet | Kích thước cấu trúc        | Vai trò và trường có bằng chứng                                                                                                                                                                                                                                                                                                           |
| ----- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01   | A1:Q274; hàng 1 là header  | Nhật ký yêu cầu/cấp phát: STT, Ngày yêu cầu, Khoa, Loại đồng phục, Mã NV, Họ tên CBNV, Chức danh, giới tính, Số lượng, Size, Số lượng cấp phát, Ngày cấp phát, Ghi chú, PR, PO, Mã hàng, Tên hàng. PR/PO được nhận diện trực tiếp ở N1/O1.                                                                                                |
| S02   | A1:R56; header ghép 2 hàng | Tổng hợp nhu cầu/mua: STT, Tên mặt hàng, Mã hàng, ĐVT, Số lượng, Ghi chú, Đơn giá, Thành tiền, Ngân sách, Mã code Ngân sách, Tên khoa, Tháng mua hàng. Cột M–O có dữ liệu phụ nhưng không có header; không gán nghĩa nghiệp vụ cho chúng.                                                                                                 |
| S03   | A1:K11; header hàng 3–4    | Biểu mẫu đề nghị: Mã NV, Họ và tên, giới tính, Số lượng, Tên hàng/Loại trang phục, Size, Ngày cấp phát gần nhất, Chức danh, Ghi chú. Có nhãn cuối biểu mẫu về người lập/lĩnh và xác nhận/phê duyệt; không có hồ sơ thực hiện hay trình tự duyệt cấu trúc. Một nhãn bổ sung H3 chưa được ánh xạ chắc chắn; không dùng làm công thức quota. |
| S04   | A1, không có ô dữ liệu     | Sheet trống; không chứng minh danh mục, chính sách hoặc workflow nào.                                                                                                                                                                                                                                                                     |

S01 có nhiều dòng lặp Mã NV: đó là lịch sử nhiều giao dịch, không phải bảng master nhân viên duy nhất. Mã nhân viên và mã hàng lưu dạng text; PR/PO có ô kiểu số nhưng phải được coi là định danh, không dùng tính toán hoặc ép số trong ứng dụng. S01 dùng Excel serial cho ngày; ứng dụng giữ ISO `YYYY-MM-DD`, hiển thị vi-VN. Ghi chú trộn text và số nên không diễn giải số trong ghi chú thành ngày/trạng thái.

Kiểm tra độ đầy đủ trên 273 dòng S01: ngày yêu cầu/khoa/loại/mã NV/họ tên/lượng yêu cầu đều có giá trị; chức danh trống 43, giới tính trống 2, size trống 13. Lượng cấp và ngày cấp chỉ có ở 26 dòng mỗi trường; PR có ở 268, PO ở 20, mã hàng ở 267, tên hàng ở 266. Có 190 định danh nhân viên khác nhau trong 273 dòng. Đây là thống kê chất lượng dữ liệu, **không chứng minh trường nào bắt buộc theo chính sách**, vì không có validation. Ô lượng/giá/thành tiền là numeric hoặc công thức, các nhãn khoa/loại/ngân sách là text; tháng mua cần chuẩn hóa khi nhập, không lấy kiểu ô làm chính sách. Đối chiếu lặp định danh không cho phép tự gộp người chỉ theo tên.

Giới tính có nhãn Nam/Nữ và có chỗ trống. Size có XS, S, M, L, XL, XXL/2XL, 3XL, cùng ô ghi nhiều cỡ/số lượng hoặc cỡ dạng số. Không biến cả chuỗi nhiều cỡ thành một SKU; phải tách thành dòng rõ cỡ khi nhập thủ công. S02 có ĐVT cái/đôi; không có quy tắc quy đổi chúng sang bộ.

## 3. Công thức, định dạng và kiểm soát nhập

- S01 có 19 ô công thức, phần lớn là shared-formula followers. Base formula là tham chiếu cùng hàng `K[r] = I[r]`: chép lượng yêu cầu sang lượng cấp ở một số nhóm, không phải kiểm tra định mức hoặc trừ kho. Những dòng có lượng cấp không cho thấy cấp vượt/nhỏ hơn lượng yêu cầu trong phần đã quan sát; không có căn cứ bắt buộc hỗ trợ cấp từng phần.
- S02 có 54 ô công thức (shared formulas), dạng `H[r] = G[r] × E[r]`: thành tiền = đơn giá × số lượng. Không thấy SUMIF/VLOOKUP, công thức tồn kho, quota 3 bộ hoặc trần 40%; không thấy công thức liên sheet.
- Có 2 defined names hệ thống `_xlnm._FilterDatabase`, phục vụ bộ lọc S01/S02; không phải bảng lookup nghiệp vụ. Không có Excel table hoặc data validation/dropdown được khai báo. Không có sheet/row/column ẩn được đánh dấu hoặc sheet protection.
- S01 không merge; S02 merge header và một số vùng ngân sách; S03 merge header/tựa biểu mẫu. Ứng dụng cần trường dữ liệu rõ ràng, không sao chép merge hoặc nhập lại thành tiền thủ công.
- Conditional formatting là `duplicateValues` (S01: 84 vùng/88 rule; S02: 29 vùng/rule). Có nhiều style/fill/font cùng format ngày, text và tiền. Không có legend chứng minh màu là trạng thái duyệt; không chuyển màu thành trạng thái tự động.

## 4. Thực thể, quan hệ và mức độ chắc chắn

**Explicit:** nhân viên/định danh, khoa, chức danh, giới tính, loại/cỡ/mã/tên hàng; ngày và lượng yêu cầu; ngày và lượng cấp; tham chiếu PR/PO; dòng tổng hợp lượng/đơn giá/thành tiền/ĐVT; ngân sách/mã ngân sách/khoa/tháng mua; biểu mẫu yêu cầu tham chiếu ngày cấp gần nhất.

**Mẫu vận hành có căn cứ mạnh:** nhiều dòng của một người; yêu cầu và cấp thực tế là hai sự kiện; chứng từ mua gắn với nhu cầu; tổng hợp chi phí theo khoa/tháng/ngân sách. Các cột mã hàng giữa S01/S02 không trùng trực tiếp trong phép đối chiếu chuỗi: không tự coi là khóa SAP thống nhất. Cần ánh xạ mã có người kiểm tra.

**Chưa xác minh:** loại hàng nào dành riêng nam/nữ; chức danh nào được nhận từng loại; ý nghĩa các ô thiếu; ngân sách là mã hạch toán hay hạn mức; tháng mua là dự kiến hay thực tế; trình tự/phân vai duyệt; cách quy đổi cái/đôi sang bộ; quy tắc tái cấp dựa ngày gần nhất. Không suy ra tồn hiện tại từ tổng nhu cầu hoặc ô đã cấp.

Không thấy entity tủ đồ hoặc kho tài liệu trong workbook này, nên không có căn cứ thay Document Lookup hay Locker Management.

## 5. Khác biệt và quyết định đối chiếu

| Chủ đề                     | Workbook / khác biệt                                                        | Quyết định an toàn                                                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Giới tính/cỡ               | Có giới tính; nhiều nhãn cỡ; ứng dụng chỉ có 4 cỡ seed và chưa có giới tính | Thêm thuộc tính giới tính tổng hợp cho nhân viên và biến thể hàng. Nhân viên cũ mặc định chưa cập nhật, SKU cũ dùng chung; không suy giới tính từ tên. Chuẩn hóa 2XL→XXL, XXXL→3XL; nhận cỡ số có cấu trúc. |
| Eligibility theo giới tính | Không có bảng chính sách ràng buộc                                          | Chỉ áp ràng buộc khi SKU demo được cấu hình rõ nam/nữ; giữ chức danh và quota hiện tại. Dữ liệu thiếu cần bổ sung, không tự đoán.                                                                           |
| Bộ / cái / đôi             | Đề xuất tính quota bằng bộ; Excel có đơn vị khác                            | Giữ MVP cấp/mua theo bộ, không quy đổi hoặc nhập nhóm hàng ngoài phạm vi. Ghi câu hỏi cần xác nhận; các SKU demo mới vẫn là bộ.                                                                             |
| Quota/dự trữ               | Excel không chứng minh thay đổi 3 bộ/năm hoặc 40%                           | Giữ cấu hình và snapshot, công thức issued+committed, floor quân số hoạt động×40%×1. Ngày cấp gần nhất chỉ là thông tin, không thêm thời gian chờ tái cấp.                                                  |
| PR/PO                      | Excel nhập tham chiếu thủ công                                              | Hiển thị liên kết PR/PO có thật từ quan hệ state hiện có; không tạo thêm cột nhập tay trùng nguồn.                                                                                                          |
| Ngân sách/khoa/tháng       | Thiếu trong PR hiện tại                                                     | Thêm metadata tùy chọn; mặc định tháng dự kiến theo ngày tạo demo, khoa hạch toán theo người lập/nguồn. Không áp hạn mức ngân sách chưa được chứng minh; PO lưu snapshot metadata.                          |
| Thành tiền                 | Có phép nhân lượng×giá                                                      | Tự tính và báo cáo, không thêm ô nhập tay. Bảo toàn giá lô/lịch sử.                                                                                                                                         |
| Dữ liệu nguồn              | Có danh tính/chứng từ/giá thật và chuỗi mã không đồng nhất                  | Không import. Sinh thêm các biến thể, nhân viên đạt quota và PR pending/PO hoàn tất hoàn toàn hư cấu, giữ ID demo hiện có.                                                                                  |

## 6. Thay đổi mô hình, UI và workflow đề xuất

Schema v2 mở rộng Employee.gender, Sku.gender, SupplierProduct.gender, chuẩn hóa size; Purchase.context và Order.context snapshot ngân sách/khoa/tháng. Giữ FK bằng ID hiện có, ledger kho và giá lịch sử. Migration v1→v2 không reset, không đoán thông tin thiếu và không tự bổ sung giao dịch seed vào dữ liệu người dùng đã lưu.

UI bổ sung bộ lọc giới tính/cỡ, nhãn biến thể, chọn hàng theo điều kiện cấu hình, giới tính/ngày cấp gần nhất trong danh bạ, lượng yêu cầu/đã cấp/ngày cấp và chứng từ liên quan trong hồ sơ. Form PR có metadata ngân sách/khoa/tháng; bảng tổng hợp mua có bộ lọc và thành tiền tính tự động. Trợ lý dùng cùng selector, nhận cỡ số/2XL/3XL, giới tính và metadata chứng từ; hỏi rõ khi nhiều biến thể. Không có bộ dữ liệu riêng cho chatbot.

Giữ nguyên luồng duyệt độc lập, reservation/FIFO/bàn giao/nhận từng phần PO, quota, trần dự trữ, RBAC mô phỏng, reset, điều hướng chung, thiết kế thị giác, Document Lookup và Locker Management.

## 7. Quyền riêng tư và giới hạn

Không đưa workbook vào bundle, fixture, screenshot, log ứng dụng hoặc test. Tệp tham chiếu được thêm vào .gitignore; không commit tệp. Parser phân tích không đọc các giá trị nguồn vào seed và không in dòng gốc. Các header/mô hình nêu trên không phải xác nhận chính sách sản xuất. Cần xác nhận mapping chức danh/loại/giới tính, đơn vị quy đổi, ý nghĩa ngân sách và quy trình duyệt thực tế trước khi mở rộng phạm vi. Browser có thể vẫn bị chặn bởi sandbox như phase 4; kết quả chạy/chưa chạy sẽ được ghi sau kiểm tra thực tế.

Kiểm tra literal cục bộ các mã NV và họ tên từ cột E/F với toàn bộ source/test cho kết quả **0 mã và 0 họ tên nguồn xuất hiện**. Chỉ in số đếm, không ghi tập định danh ra file. Đây là kiểm tra bổ sung, không phải công cụ bảo đảm ẩn danh tổng quát. Các tệp phân tích tạm được xóa sau khi ghi nhận cấu trúc; workbook tham chiếu được giữ nguyên, không đưa vào tài nguyên ứng dụng.

## 8. Kết quả triển khai

Đã thực hiện tăng dần trên React/TypeScript/localStorage hiện có, không thêm dependency hoặc framework:

- Schema v2 và migration v1→v2 an toàn; giữ khóa storage để tìm dữ liệu cũ, không reset/merge seed tự động. UI có thông báo chuyển đổi; version lạ/lỗi ghi giữ dữ liệu gốc và recovery có xác nhận.
- Employee/SKU/NCC có gender, chuẩn hóa alias cỡ, kiểm tra eligibility và mapping dùng chung ở UI/service. Giữ ID SKU cũ; SKU đã tạo không đổi category/gender/size. Không diễn giải màu/ô trống thành trạng thái.
- Danh mục kho lọc giới tính/cỡ; danh bạ có giới tính/ngày cấp gần nhất; hồ sơ yêu cầu phân biệt lượng yêu cầu/đã cấp/ngày và liên kết PR/PO thật có kiểm tra phạm vi. Báo cáo cấp phát và CSV bổ sung giới tính biến thể.
- PR có ngân sách/mã/khoa/tháng dự kiến, PO chụp metadata; audit PR ghi metadata trước/sau. Tab Tổng hợp mua và CSV lọc đúng phạm vi, tính giá trị từ dòng giao dịch/PO đã nhận. Không nhập tay thành tiền, không áp hạn mức ngân sách mới.
- Canonical seed giữ 120 nhân viên/6 khoa/60 tủ/8 tài liệu, mở rộng lên 22 SKU và 44 mã NCC giả; có người đạt 3 bộ, hàng XS/XXL/3XL/cỡ số, PR pending và PO received. Chứng từ mới dựng qua command nghiệp vụ, không nhân bản business logic. Nội dung chính sách đồng phục tổng hợp trong seed được cập nhật theo danh mục mới; không sửa module Tài liệu hoặc Tủ đồ.
- Trợ lý nhận nữ/nam, XS/2XL/XXL/3XL/cỡ số, ngân sách/tháng; hỏi rõ khi nhiều biến thể, đọc lại tồn/giá/trạng thái/nguồn từ cùng state. Không có dữ liệu chat độc lập hoặc API ngoài.

Các thay đổi nằm tại `src/domain/{types,schema,commands,selectors,uniform-attributes,product-search,assistant-routing,assistant}.ts`, `src/store/{store,migrations}.ts`, `src/data/seed.ts`, UI đồng phục/mua sắm/thiết lập nhân viên và thông báo migration trong app. Mô hình vật lý hiện hành ở [data-model.md](data-model.md#10-schema-vật-lý-v2--triển-khai-phase-45); yêu cầu AL45-01…07 và giả định A18…21 ở [requirements.md](requirements.md).

Không thay đổi quota 3 bộ/năm, reserve 40% cấu hình được, đơn vị bộ, reservation/FIFO, duyệt nhiều người độc lập, nhận PO từng phần, giá lịch sử, tài liệu/ACL hoặc nghiệp vụ tủ. Mock RBAC và audit phía trình duyệt vẫn không cung cấp bảo mật sản xuất.

## 9. Kiểm tra thực tế ngày 10/11/2026

Lần QA cuối: `npm run test:qa`, bắt đầu 13:46:21 UTC. Báo cáo máy ở `output/qa/summary.json`, chi tiết unit tại `output/qa/vitest.json`; Playwright JSON/HTML ở `output/playwright/`. Đây là artifact sinh khi chạy, không commit hoặc dùng làm dữ liệu ứng dụng.

| Kiểm tra                               | Kết quả thực tế                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TypeScript (`tsc --noEmit`, gồm E2E)   | Qua, exit 0                                                                                        |
| Vite production build                  | Qua, exit 0                                                                                        |
| Vitest + React Testing Library         | **149 qua / 0 thất bại / 0 bỏ qua**, 14 tệp                                                        |
| Playwright discovery                   | Nhận **38 ca**, 19 kịch bản × desktop/mobile; discovery không phải thực thi                        |
| Playwright chạy toàn suite             | Exit 1, webServer không khởi động; **0 qua / 0 ca hành vi thất bại / 0 bỏ qua / 38 chưa thực thi** |
| Browser journeys / screenshot xác minh | **0 / 0**                                                                                          |

`npm run test:qa` trả **exit 1**, status `incomplete`, Playwright `blocked`. Thử preview trực tiếp xác nhận `Error: listen EPERM: operation not permitted 127.0.0.1:4173`. Đây là hạn chế mở cổng trong môi trường, không phải kết quả pass; không thay server thật bằng route giả hoặc screenshot giả.

Các test mới: `src/domain/excel-alignment.test.ts` (19 ca), `src/test/excel-alignment.test.tsx` (4 ca). Bao phủ seed/FK, alias/chống trùng, gender/eligibility, tồn và quota, mapping, metadata/snapshot/giá lịch sử, link/phạm vi, assistant cập nhật, migration/ghi lỗi/reset. Suite cũ cũng chạy lại và đã điều chỉnh các giả định chỉ số seed để chọn đúng hồ sơ mới.

`tests/e2e/excel-alignment.spec.ts` bổ sung hai kịch bản dùng server thật: (1) lọc kho nữ XXL, điều kiện cấp, tạo yêu cầu thiếu → PR có ngân sách → duyệt → PO → nhận kho → cấp → lịch sử/PR-PO/report/chat/reload; (2) storage v1→v2 giữ IDs/giá/ledger và reload. Các ca đồng phục/mua sắm cũ vẫn bao phủ giới hạn và tồn. **Các hành vi này chưa được xác minh bằng Playwright** do lỗi server nói trên; responsive/focus, tải CSV, console/network thực tế vẫn cần chạy trên môi trường cho phép HTTP cục bộ và Chromium.

Chạy lại ở môi trường đó: `npm run test:qa`; hoặc sau `npm run build`, chạy `npm run test:e2e -- excel-alignment.spec.ts uniform-purchasing.spec.ts` để tập trung thay đổi. Không kết luận sẵn sàng trình diễn browser trước khi các ca đó thực thi.

## 10. Câu hỏi nghiệp vụ còn mở

1. Một bộ gồm những thành phần nào; cái/đôi có quy đổi sang bộ không, và nhóm hàng nào thuộc quota?
2. Ma trận chức danh–loại–giới tính–cỡ thực tế là gì; trường hợp chưa cập nhật giới tính xử lý thế nào?
3. Ngân sách/mã là phân loại hạch toán hay hạn mức; khoa/tháng áp cho cả PR hay từng dòng, dự kiến hay thực tế?
4. Ngày cấp gần nhất có tạo thời gian chờ tái cấp hay chỉ để tham khảo; có thực sự cần cấp đồng phục từng phần?
5. Trình tự/phân vai duyệt và quy tắc xác nhận mapping mã giữa các danh mục thực tế là gì?

Các câu hỏi này không chặn những thay đổi tương thích đã thực hiện. Không tự trả lời chúng bằng quy tắc mới và không chuyển sang prompt 5.
