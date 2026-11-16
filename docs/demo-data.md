# Dữ liệu trình diễn hư cấu — phase 5

Nguồn canonical duy nhất: `src/data/seed.ts`. Module, báo cáo, trợ lý và kiểm tra khởi đầu đọc cùng `State`; `src/domain/demo-scenarios.ts` chỉ giữ hướng dẫn và ID tham chiếu, không có kho dữ liệu giao dịch thứ hai. Không copy danh tính, mã, giá hay bản ghi từ workbook thật.

## Tổ chức và người

Seed mới có 120 nhân viên, 6 khoa/phòng, 21 tài khoản đóng vai. Tất cả có tên “Nhân viên demo nnn”, mã `DEMO-NV-nnn`. Quân số tính từ nhân viên hoạt động, không phải số tài khoản.

| Khoa/phòng     | Số người |
| -------------- | -------: |
| Khoa Khám bệnh |       30 |
| Khoa Nội       |       25 |
| Khoa Ngoại     |       20 |
| Điều dưỡng     |       15 |
| Hành chính     |       15 |
| Tài chính      |       15 |

| Nhân viên     | Thuộc tính demo                                            | Dùng để minh họa                                 |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| NV004         | Khám bệnh, bác sĩ nam, đã nhận 3 bộ trong năm 2026         | Hết quota mặc định                               |
| NV031         | Nội, điều dưỡng nữ, đã nhận 2 bộ, giá lịch sử 260.000 đồng | Xin thêm 1 được; kịch bản 1                      |
| NV032         | Nội, điều dưỡng nam, đang giữ 2 bộ DP-DD-M                 | Tồn giữ khác tồn vật lý; không dùng cho nhóm mới |
| NV033         | Nội, bác sĩ nữ, chờ 2 bộ DP-BS-XL                          | Nguồn thiếu DEMO-YC-002; kịch bản 2              |
| NV035         | Nội, điều dưỡng nữ, chưa cấp/cam kết                       | Nhận DP-DD-M; kịch bản 1                         |
| NV036         | Nội, kỹ thuật viên nam, chưa cấp/cam kết                   | Nhận DP-KT-M; kịch bản 1                         |
| NV001/002/003 | Khám bệnh, đang hoạt động, chưa nhận tủ                    | Nhóm ba tủ; kịch bản 4                           |

Tài khoản: `coord` Điều phối Nội → `head` Trưởng khoa Nội → `hc` Hành chính → `warehouse` Thủ kho trong luồng cấp. `buyer` Mua sắm; `finance` Tài chính; `leader` Lãnh đạo cho PR. `docs` quản lý tài liệu, `employee` nhân viên xem cá nhân, `system` quản trị cấu hình/reset. Đây là chọn vai trò demo, không xác thực thật.

## Hàng và kho

22 SKU: bác sĩ/điều dưỡng/kỹ thuật/hành chính với S/M/L/XL dùng chung, thêm XS/XXL nữ, XXL nam, 3XL dùng chung, cỡ số 40 nam. Một SKU là một bộ, một loại, một giới tính cấu hình, một cỡ. Alias `2XL→XXL`, `XXXL→3XL`; không chuyển cái/đôi sang bộ. Quota mặc định 3 bộ/người/năm; dự trữ floor(120×40%×1)=48 bộ mỗi PR theo giả định hiện có.

| Mã hiển thị   | ID           | Tình huống và giá tổng hợp                                                                      |
| ------------- | ------------ | ----------------------------------------------------------------------------------------------- |
| DP-DD-M       | SKU-1-1      | Kho trung tâm 10 vật lý/2 giữ/8 khả dụng; giá hiện tại 300.000 đồng, lịch sử NV031 260.000 đồng |
| DP-KT-M       | SKU-2-1      | Có tồn để cấp NV036; giá 320.000 đồng                                                           |
| DP-BS-XL      | SKU-0-3      | Tồn 0, thiếu 2 bộ; giá 420.000 đồng; NCC SAP-A-1003                                             |
| DP-DD-NU-XS   | SKU-DD-F-XS  | 18 bộ vật lý; giá 318.000 đồng; PR seed pending                                                 |
| DP-DD-NU-XXL  | SKU-DD-F-XXL | 0 bộ, giá 328.000 đồng; kiểm tra biến thể nữ/alias 2XL                                          |
| DP-BS-NAM-XXL | SKU-BS-M-XXL | Lịch sử đã cấp 3 bộ cho NV004; giá 436.000 đồng                                                 |
| DP-HC-NAM-40  | SKU-HC-M-40  | 15 bộ vật lý gồm 2 bộ nhận từ PO seed; giá 292.000 đồng                                         |
| DP-KT-L       | SKU-2-2      | Chưa có mapping xác nhận trong seed phase 5; đối chiếu NCC ở kịch bản 5                         |

Kho trung tâm và kho Nội dùng ledger/lô; không có số dư nhập tay độc lập. Bàn giao giảm vật lý; duyệt cuối chỉ giữ hàng; PR/PO chưa làm tăng kho. Nhận PO mới thêm lô và movement. Giá lịch sử lấy từ lô, không đổi theo danh mục hiện tại.

## Nhà cung cấp và chứng từ

44 mã NCC tổng hợp của **Đồng Phục An Tâm (demo)** và **May Minh An (demo)**. Đối sánh tính loại 50 + cỡ 30 + chất liệu mẫu 20; giới tính sai không được xác nhận. Cỡ/loại sai bị chặn; khác chất liệu phải được người mua xem và xác nhận có lý do, không tự chốt vì điểm cao.

Trong kịch bản 5: `SAP-A-1010`/`SP-A-SKU-2-2` đúng kỹ thuật, L, dùng chung, Cotton 65%, 100%; `SAP-B-2010` dùng Polyester 80%, 80%. Nhu cầu mẫu chọn Cotton, do đó người mua xác nhận mã A. Seed còn 21 mapping đã xác nhận; chỉ SKU-2-2 cố ý chưa được xác nhận. Không xóa mapping trong dữ liệu người dùng đã lưu.

Seed có 4 yêu cầu đồng phục: lịch sử issued, một reserved, một waiting_stock và một issued tạo qua command cho người đạt quota. Có 2 PR (một ordered, một pending), 1 PO received, 1 receipt. PR/PO seed được tạo qua chính luồng duyệt/nhận hàng; ID mới sinh bởi sequence, dùng bảng để chọn theo trạng thái/mã hàng, không nhập giả một số PO cố định. PR pending 1 XS nữ, giá 318.000 đồng, tháng 2026-11; PO nhận đủ 2 bộ nam cỡ 40, giá trị 584.000 đồng, tháng 2026-10. Mã ngân sách seed `DEMO-NS-HC-26`.

## Tài liệu và tủ

8 tài liệu nội bộ/hợp đồng tổng hợp: chính sách đồng phục v2, quy trình mua, quy định tủ, một bản cần che/rà soát, một bản thu hồi và một bản hết hiệu lực. Nguồn chính cho kịch bản 3: **DEMO-TL-004 — Hợp đồng cung cấp đồng phục An Tâm**, phiên bản 1, mục 2 ghi thời hạn mẫu 10 ngày làm việc từ xác nhận PO. Được đọc bởi buyer/finance/leader/documents; tài khoản nhân viên không được đọc. Trích dẫn kiểm tra lại quyền và hiệu lực mỗi lần mở.

60 tủ trên **Tòa A (tầng 1/2)** và **Tòa B (tầng 3)**, các khu A/B/C. 20 tủ đã dùng, 3 bảo trì, 37 trống đủ điều kiện. ID/vị trí không lấy từ workbook gốc. NV001/002/003 chưa có tủ. Xem trước gợi ý không ghi; cấp nhóm ba người tạo 3 sự kiện, còn 34 tủ trống. Sở hữu khoa và người dùng là quan hệ riêng.

## Khởi tạo và bảo toàn dữ liệu

Lần đầu mở ứng dụng trên storage rỗng nạp seed. State schema v2 vẫn dùng khóa `vinmec-admin-demo:state:v1`; v1 được chuyển tương thích, không bổ sung giao dịch seed hoặc xóa mapping đã lưu. Dữ liệu phase trước có thể chưa có hai tòa hoặc còn mapping SKU-2-2: chỉ **reset có xác nhận** mới nạp bộ phase 5. Nút mở kịch bản không thay business state. Reload giữ thay đổi; thông báo tab khác giúp tránh ghi đè. Không hỗ trợ đồng bộ nhiều thiết bị.

Các con số đầu buổi trong tài liệu áp dụng ngay sau reset, chưa chạy kịch bản nào. Sau đó đọc số hiện hành từ UI/selector. Để chạy lại cả năm, reset có chủ ý một lần rồi thực hiện theo [demo-guide.md](demo-guide.md).
