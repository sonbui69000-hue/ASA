import type { Line, ReadState as State } from "./types";
import {
  account,
  availableLockers,
  canReadDocument,
  committed,
  issued,
  shortlist,
  shortageRows,
  stock,
} from "./selectors";
import { eligibleSku } from "./uniform-attributes";

// Guidance references the canonical demo records; it never supplies a second dataset.
export const demoUniformLines: Line[] = [
  { employeeId: "DEMO-NV-031", skuId: "SKU-1-1", quantity: 1 },
  { employeeId: "DEMO-NV-035", skuId: "SKU-1-1", quantity: 1 },
  { employeeId: "DEMO-NV-036", skuId: "SKU-2-1", quantity: 1 },
];
export const demoLockerEmployees = [
  "DEMO-NV-001",
  "DEMO-NV-002",
  "DEMO-NV-003",
];
export const demoMatchSkuId = "SKU-2-2";
export const demoScenarios = [
  {
    id: "uniform-group",
    title: "Đề nghị đồng phục cho nhóm",
    duration: "2 phút 30 giây",
    actorId: "coord",
    path: "/dong-phuc/yeu-cau",
    start:
      "NV031 đã nhận 2 bộ; NV035 và NV036 còn hạn mức. Kho đủ hai bộ điều dưỡng M và một bộ kỹ thuật M.",
    steps: [
      "Lập yêu cầu tại khoa Nội: NV031 và NV035 chọn DP-DD-M, NV036 chọn DP-KT-M; mỗi người 1 bộ.",
      "Lưu nháp, mở hồ sơ và gửi duyệt. Chọn Trưởng khoa Nội rồi Hành chính tổng hợp để duyệt từng bước.",
      "Chọn Thủ kho trung tâm, mở lại hồ sơ và xác nhận bàn giao. Xem lịch sử của NV031.",
    ],
    outcome:
      "Một yêu cầu 3 người đã cấp; NV031 đạt 3 bộ/năm. Lịch sử giữ nguyên giá cũ 260.000 đồng.",
  },
  {
    id: "stock-shortage",
    title: "Thiếu hàng chuyển thành đề nghị mua",
    duration: "1 phút 30 giây",
    actorId: "buyer",
    path: "/mua-sam/nhu-cau",
    start:
      "DEMO-YC-002 đang thiếu 2 bộ bác sĩ XL cho NV033; tồn DP-BS-XL bằng 0, chưa có PR liên kết.",
    steps: [
      "Mở dòng DEMO-YC-002 tại Nhu cầu bổ sung và chọn Tạo bản nháp mua.",
      "Kiểm tra 2 bộ DP-BS-XL, nguồn yêu cầu và mã NCC; nhập mã ngân sách DEMO-NS-LIVE, giữ khoa Nội/tháng 2026-11.",
      "Lưu đề nghị nháp và mở hồ sơ. Chỉ rõ ba bước duyệt; PR nháp chưa tăng kho hoặc tạo PO.",
    ],
    outcome:
      "Có PR nháp liên kết đúng phần thiếu 2 bộ; tồn vẫn 0. PO/phiếu nhận hoàn tất khác đã có trong seed để minh họa.",
  },
  {
    id: "contract-citation",
    title: "Hỏi hợp đồng và mở đúng dẫn nguồn",
    duration: "1 phút 30 giây",
    actorId: "buyer",
    path: "/tai-lieu",
    start:
      "Tài khoản Mua sắm được đọc hợp đồng An Tâm hư cấu, phiên bản 1, mục 2.",
    steps: [
      "Mở Trợ lý demo và hỏi: Thời hạn giao hàng trong hợp đồng An Tâm là gì?",
      "Đối chiếu câu trả lời 10 ngày làm việc, chọn dẫn nguồn Hợp đồng cung cấp đồng phục An Tâm • v1 • 2.",
      "Đọc mục 2 được đánh dấu. Giải thích trợ lý lấy đoạn từ dữ liệu mô phỏng theo quyền hiện tại.",
    ],
    outcome:
      "Mở DEMO-TL-004?version=1#muc-2 và đọc được đoạn làm căn cứ; không có kết nối LLM ngoài.",
  },
  {
    id: "locker-group",
    title: "Phân bổ tủ cho nhóm nhân viên",
    duration: "1 phút 30 giây",
    actorId: "hc",
    path: "/tu-do",
    start:
      "NV001, NV002, NV003 chưa có tủ; seed có 37 tủ trống đủ điều kiện trên nhiều tòa/tầng.",
    steps: [
      "Chọn Phân bổ tủ, số lượng 3; chọn NV001, NV002, NV003 (máy tính giữ Ctrl/Cmd để chọn nhiều).",
      "Nhập lý do Phân bổ nhóm trình diễn; chọn Gợi ý danh sách tủ. Xem trước chưa ghi dữ liệu.",
      "Xác nhận phân bổ; xem tab Lịch sử bàn giao hoặc KPI tủ trống trên Tổng quan.",
    ],
    outcome:
      "3 người nhận 3 tủ khác nhau, 3 sự kiện mới; từ bộ dữ liệu mới, số tủ trống giảm 37 xuống 34.",
  },
  {
    id: "supplier-match",
    title: "Đối chiếu mã SAP chưa chắc chắn",
    duration: "1 phút 30 giây",
    actorId: "buyer",
    path: "/mua-sam/nha-cung-cap",
    start:
      "DP-KT-L chưa có ánh xạ được xác nhận. Catalog có ứng viên Cotton 65% và Polyester 80% để so sánh.",
    steps: [
      "Chọn mã nội bộ DP-KT-L, tìm bộ kỹ thuật. So sánh SAP-A-1010 (100%) và SAP-B-2010 (80%, khác chất liệu).",
      "Chọn đúng SAP-A-1010: cùng loại kỹ thuật, cỡ L, dùng chung, Cotton 65%. Chọn Xác nhận đối sánh.",
      "Ghi lý do Đã đối chiếu loại, cỡ L và Cotton 65% trong catalog demo; xác nhận. Tải lại để thấy Đã đối chiếu.",
    ],
    outcome:
      "Mapping SKU-2-2 → SP-A-SKU-2-2 được người mua xác nhận và có audit. Điểm phù hợp là quy tắc, không phải xác suất AI.",
  },
] as const;
export type DemoScenario = (typeof demoScenarios)[number];
export function scenarioReadiness(
  s: State,
  scenario: DemoScenario,
): { ready: boolean; reason: string } {
  const actor = s.accounts.find((a) => a.id === scenario.actorId);
  if (!actor || !s.employees.some((e) => e.id === actor.employeeId && e.active))
    return {
      ready: false,
      reason:
        "Tài khoản bắt đầu không còn hoạt động; nạp lại bộ trình diễn để tiếp tục.",
    };
  let ready = false;
  switch (scenario.id) {
    case "uniform-group": {
      const needed = new Map<string, number>();
      ready =
        demoUniformLines.every((l) => {
          const e = s.employees.find((e) => e.id === l.employeeId),
            sku = s.skus.find((x) => x.id === l.skuId);
          needed.set(l.skuId, (needed.get(l.skuId) || 0) + l.quantity);
          return (
            !!e &&
            !!sku &&
            e.departmentId === "NOI" &&
            eligibleSku(sku, e) &&
            issued(s, e.id) + committed(s, e.id) + l.quantity <=
              s.settings.annualLimit
          );
        }) && [...needed].every(([id, n]) => stock(s, id).available >= n);
      break;
    }
    case "stock-shortage":
      ready =
        shortageRows(s).some(
          (r) =>
            r.requestId === "DEMO-YC-002" &&
            r.skuId === "SKU-0-3" &&
            r.quantity === 2,
        ) &&
        !s.purchases.some(
          (p) =>
            p.status !== "cancelled" &&
            p.status !== "rejected" &&
            p.lines.some((l) => l.sourceRequestId === "DEMO-YC-002"),
        );
      break;
    case "contract-citation": {
      const d = s.documents.find((d) => d.id === "DEMO-TL-004");
      ready =
        !!d &&
        canReadDocument(s, account(s, scenario.actorId), d) &&
        d.version === 1 &&
        d.sections.some((sec) => sec.id === "muc-2");
      break;
    }
    case "locker-group":
      ready =
        availableLockers(s).length >= 3 &&
        demoLockerEmployees.every(
          (id) =>
            s.employees.some((e) => e.id === id && e.active) &&
            !s.lockers.some((l) => l.employeeId === id || l.reservedFor === id),
        );
      break;
    case "supplier-match":
      ready =
        !s.mappings.some((m) => m.skuId === demoMatchSkuId) &&
        shortlist(s, demoMatchSkuId).some(
          (x) => x.product.id === "SP-A-SKU-2-2" && x.score === 100,
        );
      break;
  }
  return {
    ready,
    reason: ready
      ? "Đủ điều kiện bắt đầu từ dữ liệu hiện tại."
      : "Dữ liệu đã khác điểm bắt đầu. Nạp lại bộ trình diễn nếu muốn chạy lại từ đầu.",
  };
}
