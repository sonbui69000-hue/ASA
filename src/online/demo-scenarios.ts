import type { ReadState } from "../domain/types";
// Generic online guidance deliberately contains no privileged seed records or expected answers.
export const demoScenarios = [
  {
    id: "uniform-group",
    title: "Đề nghị đồng phục cho nhóm",
    duration: "2 phút 30 giây",
    actorId: "coord",
    path: "/dong-phuc/yeu-cau",
    start: "Chọn nhân viên trong phạm vi khoa và kiểm tra hạn mức hiện tại.",
    steps: [
      "Đăng nhập tài khoản điều phối và lập yêu cầu cho các nhân viên được phép.",
      "Người duyệt đăng nhập bằng mã riêng, kiểm tra và xác nhận từng bước.",
      "Thủ kho bàn giao; hỏi trợ lý để đối chiếu tồn và lịch sử mới.",
    ],
    outcome: "Hồ sơ, kho và trợ lý cùng đọc một state đã commit trên máy chủ.",
  },
  {
    id: "stock-shortage",
    title: "Thiếu hàng chuyển thành đề nghị mua",
    duration: "1 phút 30 giây",
    actorId: "buyer",
    path: "/mua-sam/nhu-cau",
    start: "Kiểm tra các nhu cầu bổ sung hiện được phép xem.",
    steps: [
      "Mở nhu cầu có thật trong danh sách, lập đề nghị có liên kết.",
      "Kiểm tra mã NCC, lượng và metadata ngân sách trước gửi.",
      "Đi qua từng bên duyệt, tạo PO mô phỏng và nhận hàng theo quy tắc.",
    ],
    outcome: "Trợ lý chỉ báo số liệu từ hồ sơ và các phiếu nhận đã lưu.",
  },
  {
    id: "contract-citation",
    title: "Hỏi tài liệu và mở đúng dẫn nguồn",
    duration: "1 phút 30 giây",
    actorId: "buyer",
    path: "/tai-lieu",
    start: "Chỉ sử dụng tài liệu đã xuất bản, còn hiệu lực và được phép đọc.",
    steps: [
      "Chọn tài liệu trong danh sách được phép và đặt câu hỏi theo nội dung đó.",
      "Kiểm tra đoạn dẫn nguồn, phiên bản và mục trong câu trả lời.",
      "Mở nguồn để đối chiếu; không có nguồn thì trợ lý báo chưa đủ dữ liệu.",
    ],
    outcome:
      "Nội dung và tên tài liệu hạn chế không được đưa vào hướng dẫn tĩnh.",
  },
  {
    id: "locker-group",
    title: "Phân bổ tủ cho nhóm nhân viên",
    duration: "1 phút 30 giây",
    actorId: "hc",
    path: "/tu-do",
    start:
      "Kiểm tra khả năng đáp ứng và nhân viên được phép trên state hiện tại.",
    steps: [
      "Nhập số lượng và người hoặc đơn vị nhận.",
      "Xem trước danh sách tủ; bước này chưa ghi dữ liệu.",
      "Xác nhận phân bổ rồi hỏi trợ lý về số tủ còn trống.",
    ],
    outcome: "Tủ vừa cấp không còn trong kết quả trống của công cụ máy chủ.",
  },
  {
    id: "supplier-match",
    title: "Đối chiếu mã SAP mô phỏng",
    duration: "1 phút 30 giây",
    actorId: "buyer",
    path: "/mua-sam/nha-cung-cap",
    start: "Chọn sản phẩm hiện có và xem các ứng viên được gợi ý.",
    steps: [
      "Đối chiếu loại, cỡ, giới tính và chất liệu trong danh mục mô phỏng.",
      "Nếu phù hợp, người mua ghi lý do và xác nhận tại biểu mẫu.",
      "Hỏi trợ lý để kiểm tra mapping đã xác nhận; AI không tự xác nhận.",
    ],
    outcome:
      "Mapping được người có quyền xác nhận và ghi nhật ký trên cùng nguồn dữ liệu.",
  },
] as const;
export type DemoScenario = (typeof demoScenarios)[number];
export function scenarioReadiness(s: ReadState, scenario: DemoScenario) {
  return {
    ready: s.accounts.some((a) => a.id === scenario.actorId),
    reason:
      "Mở trang và đăng nhập vai trò phù hợp bằng mã riêng. Mọi điều kiện được máy chủ kiểm khi thao tác; hướng dẫn không tự ghi dữ liệu.",
  };
}
