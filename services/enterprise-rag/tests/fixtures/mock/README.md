# Dữ liệu mô phỏng nghiệp vụ hành chính bệnh viện

Bộ dữ liệu tiếng Việt dùng để kiểm thử tra cứu, trích dẫn và đối chiếu giữa bảng biểu, quy định theo thời điểm và hợp đồng có phụ lục. Toàn bộ nhân viên, tổ chức, mã định danh, giao dịch và điều khoản đều được tạo cho kịch bản giả lập. Bộ dữ liệu không chứa thông tin định danh người bệnh hoặc nhân viên thật.

## Tệp dữ liệu

| Tệp | Nội dung |
| --- | --- |
| [Đơn đồng phục](data/uniform_orders.csv) | 180 đơn với số lượng yêu cầu, số lượng thực cấp và ngày cấp. |
| [Tủ nhân viên nam](data/male_lockers.csv) | 480 tủ thuộc 7 dãy, có tủ đang sử dụng, đã thu hồi, trống và cần xác minh. |
| [Hợp đồng cung cấp đồng phục](documents/contracts/hd-cung-cap-dong-phuc.pdf) | Lịch giao hai đợt, số lượng, đơn giá, nghiệm thu và thanh toán. |
| [Phụ lục điều chỉnh lịch giao](documents/contracts/pl-dieu-chinh-lich-giao.pdf) | Thay đổi ngày giao của đợt 02 sau ngày hiệu lực của phụ lục. |
| [Hợp đồng bảo trì tủ](documents/contracts/hd-bao-tri-tu.pdf) | Cam kết phản hồi và ảnh bảng phí ngoài giờ được làm mờ có chủ đích. |
| [Quy định đồng phục v1](documents/policies/cs-dong-phuc-v1.pdf) và [v2](documents/policies/cs-dong-phuc-v2.pdf) | Hai mức cấp phát chuyên môn áp dụng trong các giai đoạn khác nhau. |
| [Quy định quản lý tủ](documents/policies/cs-quan-ly-tu.pdf) | Cấp, thu hồi và xác minh khi dữ liệu người dùng chưa rõ. |
| [Danh mục tài liệu](document_catalog.yaml) | Phiên bản, kỳ hiệu lực, liên kết thay thế hoặc sửa đổi, phân loại và vai trò được phép tra cứu. |
| [Ca kiểm thử](tests/qa_cases.csv) | 13 câu hỏi, vai trò, mốc tra cứu, câu trả lời mong đợi và nguồn dẫn. |

## Đọc dữ liệu và chạy kịch bản

- Các tệp CSV dùng UTF-8 có BOM và dấu phẩy. Khi mở trong Excel, nhập các cột mã, dãy tủ và số tủ dưới dạng văn bản để giữ số 0 ở đầu. Dùng trình đọc CSV hỗ trợ ô nhiều dòng.
- Nối mã nhân viên từ cột `Mã NV` của đơn đồng phục với `Mã nhân viên` của bảng tủ. Trích dẫn dòng bằng `Mã dòng`. Ngày dùng định dạng ISO `YYYY-MM-DD`. Ô ngày cấp đồng phục trống đi kèm số lượng thực cấp bằng 0.
- Đối chiếu định mức đồng phục theo ngày yêu cầu. Trường `as_of` trong bộ ca kiểm thử là mốc tra cứu. Trường `effective_until_inclusive` bao gồm ngày cuối. Với phụ lục hợp đồng, áp dụng điều khoản thay đổi từ ngày phụ lục có hiệu lực và giữ các điều khoản còn hiệu lực của hợp đồng gốc.
- Khi thử nghiệm phân quyền, máy chủ xác thực vai trò người dùng rồi lọc theo `allowed_roles` trước khi truy xuất đoạn văn hoặc tạo câu trả lời. Kiểm tra cả nội dung, đoạn trích và nguồn dẫn khi yêu cầu bị từ chối. Hai bảng CSV là nguồn thử nghiệm dùng chung trong các ca kiểm thử này.
- Nhãn **MẬT NỘI BỘ (MÔ PHỎNG)** thể hiện quyền đọc trong ứng dụng thử nghiệm. Mọi tệp trong kho công khai đều có thể được tải xuống. YAML mô tả quyền mong đợi để ứng dụng kiểm thử thực thi. Tệp câu trả lời mẫu dành cho người đánh giá và cần nằm ngoài tập tài liệu đưa vào chỉ mục tra cứu.
- Khi không đọc được bảng phí hoặc bản ghi tủ có nhiều tên và thiếu mã nhân viên, yêu cầu xác minh. Khi thiếu biên bản nghiệm thu, nêu rõ bằng chứng còn thiếu. Khi ngày giao trong hợp đồng và phụ lục khác nhau, dẫn hai văn bản và nêu mốc có hiệu lực tại thời điểm đối chiếu.

## Dòng đưa vào Mục 5 của báo cáo

**Dữ liệu:** [Bộ dữ liệu mô phỏng nghiệp vụ hành chính bệnh viện](<URL-kho-GitHub-công-khai>). Toàn bộ dữ liệu được tạo cho mục đích kiểm thử, không chứa thông tin định danh người bệnh.
