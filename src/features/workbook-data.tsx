import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDemo } from "../app/context";
import {
  Badge,
  Button,
  DataTable,
  Field,
  Modal,
  Notice,
  Panel,
  Tabs,
} from "../components/shared";
import {
  canReadWorkbookData,
  workbookIssueLabels,
} from "../domain/workbook-data";

type Kind = "uniforms" | "purchases" | "lockers" | "faults";
const labels: Record<string, string> = {
  employeeCode: "Mã nhân viên",
  employeeName: "Họ và tên",
  department: "Khoa / phòng",
  jobTitle: "Chức danh",
  gender: "Giới tính",
  uniformType: "Loại đồng phục",
  sizeRaw: "Cỡ ghi trong file",
  size: "Cỡ đã chuẩn hóa",
  requestedQuantityRaw: "Lượng yêu cầu ghi trong file",
  requestedQuantity: "Lượng yêu cầu đã đọc",
  issuedQuantityRaw: "Lượng đã cấp ghi trong file",
  issuedQuantity: "Lượng đã cấp đã đọc",
  requestDateRaw: "Ngày yêu cầu ghi trong file",
  requestDate: "Ngày yêu cầu đã đọc",
  issueDateRaw: "Ngày cấp ghi trong file",
  issueDate: "Ngày cấp đã đọc",
  prReference: "Tham chiếu PR nguồn",
  poReference: "Tham chiếu PO nguồn",
  productCode: "Mã hàng nguồn",
  productName: "Tên hàng nguồn",
  notes: "Ghi chú nguồn",
  unit: "Đơn vị tính nguồn",
  quantity: "Số lượng đã đọc",
  quantityRaw: "Số lượng ghi trong file",
  unitPrice: "Đơn giá đã đọc",
  unitPriceRaw: "Đơn giá ghi trong file",
  sourceTotalRaw: "Thành tiền lưu trong file",
  budgetName: "Ngân sách",
  budgetCode: "Mã ngân sách",
  purchaseMonthRaw: "Tháng mua ghi trong file",
  section: "Phòng / dãy tủ trong file",
  number: "Nhãn / số tủ nguồn",
  allocationDate: "Ngày cấp tủ đã đọc",
  allocationDateRaw: "Ngày cấp tủ ghi trong file",
  returnDate: "Ngày thu hồi đã đọc",
  returnDateRaw: "Ngày thu hồi ghi trong file",
  conditionRaw: "Tình trạng ghi trong file",
};
export function WorkbookDataPanel({ kind }: { kind: Kind }) {
  const { state, actor } = useDemo();
  const location = useLocation();
  const data = canReadWorkbookData(actor.role) ? state.workbookData : undefined;
  const [selected, setSelected] = useState(""),
    [reviewOnly, setReviewOnly] = useState(false),
    [lockerKind, setLockerKind] = useState<"lockers" | "faults">("lockers");
  const type = kind === "lockers" ? lockerKind : kind;
  const entries =
    type === "uniforms"
      ? data?.uniformRequests || []
      : type === "purchases"
        ? data?.uniformPurchases || []
        : type === "faults"
          ? data?.lockerFaults || []
          : data?.lockers || [];
  const rows = entries.map((entry) => {
    const r = entry as typeof entry & Record<string, unknown>;
    return {
      id: entry.id,
      source: `${entry.sheet} · dòng ${entry.row}`,
      name: String(r.employeeName || r.productName || "Chưa ghi trong file"),
      code: String(
        r.employeeCode || r.productCode || r.number || "Chưa ghi mã",
      ),
      scope: [r.department, r.section].filter(Boolean).join(" · "),
      summary:
        type === "uniforms"
          ? `${r.uniformType} · ${r.sizeRaw || "chưa có cỡ"} · yêu cầu ${r.requestedQuantityRaw || "—"} · đã cấp ${r.issuedQuantityRaw || "—"}`
          : type === "purchases"
            ? `${r.quantityRaw || "—"} ${r.unit || ""} · ${r.budgetCode || "chưa có mã ngân sách"}`
            : type === "faults"
              ? String(r.conditionRaw || "Cần rà soát nguồn")
              : `Cấp: ${r.allocationDate || r.allocationDateRaw || "chưa rõ"} · Thu: ${r.returnDate || r.returnDateRaw || "chưa rõ"}`,
      issues: entry.issues,
      record: r,
    };
  });
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("record");
    setSelected(id && entries.some((r) => r.id === id) ? id : "");
  }, [location.search, type, data?.fingerprint]);
  const current = rows.find((r) => r.id === selected);
  if (!data)
    return (
      <Notice>
        Dữ liệu Excel chưa được nhập hoặc không nằm trong phạm vi được phép.
      </Notice>
    );
  return (
    <>
      <Notice>
        <strong>Dữ liệu nguồn chỉ lưu cục bộ · OpenRouter bị chặn.</strong> Giữ
        nguyên tên và mã trong workbook. Đây là nhật ký nguồn; trạng thái phê
        duyệt, tồn kho và tủ đang trống chưa được suy ra từ ô trống hoặc tham
        chiếu PR/PO. Các giao dịch nghiệp vụ hiện có được giữ nguyên.
      </Notice>
      {kind === "lockers" && (
        <Tabs
          value={lockerKind}
          onChange={(v) => setLockerKind(v as "lockers" | "faults")}
          tabs={[
            {
              id: "lockers",
              label: "Danh sách tủ nguồn",
              count: data.lockers.length,
            },
            {
              id: "faults",
              label: "Tình trạng lỗi nguồn",
              count: data.lockerFaults.length,
            },
          ]}
        />
      )}
      <Panel
        title={
          type === "uniforms"
            ? "Yêu cầu và cấp phát từ Excel"
            : type === "purchases"
              ? "Tổng hợp mua từ Excel"
              : type === "faults"
                ? "Danh sách tủ lỗi từ Excel"
                : "Danh sách cấp và thu tủ từ Excel"
        }
        description={`${entries.length} dòng nguồn · Có số dòng để đối chiếu workbook · Dữ liệu thiếu được giữ để rà soát`}
      >
        <Field label="Lọc dòng nguồn">
          <label>
            <input
              type="checkbox"
              checked={reviewOnly}
              onChange={(e) => setReviewOnly(e.target.checked)}
            />{" "}
            Chỉ hiện dòng cần rà soát
          </label>
        </Field>
        <DataTable
          caption="Dữ liệu Excel cục bộ"
          rows={rows.filter((r) => !reviewOnly || r.issues.length > 0)}
          searchText={(r) =>
            [
              r.name,
              r.code,
              r.scope,
              r.summary,
              r.source,
              String(r.record.prReference || ""),
              String(r.record.poReference || ""),
            ].join(" ")
          }
          columns={[
            {
              key: "name",
              label: type === "purchases" ? "Mặt hàng" : "Người sử dụng",
              render: (r) => r.name,
            },
            { key: "code", label: "Mã / số nguồn", render: (r) => r.code },
            {
              key: "scope",
              label: "Khoa / vị trí",
              render: (r) => r.scope || "Chưa ghi",
            },
            {
              key: "summary",
              label: "Thông tin nguồn",
              render: (r) => r.summary,
            },
            {
              key: "source",
              label: "Vị trí trong file",
              render: (r) => r.source,
            },
            {
              key: "issues",
              label: "Rà soát",
              render: (r) => (
                <Badge>
                  {r.issues.length
                    ? `${r.issues.length} lưu ý`
                    : "Đã đọc đủ trường"}
                </Badge>
              ),
            },
            {
              key: "action",
              label: "Chi tiết",
              render: (r) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelected(r.id)}
                >
                  Xem chi tiết
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      <Modal
        open={!!current}
        onOpenChange={(v) => !v && setSelected("")}
        title="Chi tiết dòng Excel"
        description={current?.source}
        wide
      >
        {current && (
          <>
            <dl className="detail-grid">
              {Object.entries(current.record)
                .filter(([key]) => labels[key])
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{labels[key]}</dt>
                    <dd>
                      {value === null || value === ""
                        ? "Chưa ghi / chưa xác định"
                        : String(value)}
                    </dd>
                  </div>
                ))}
            </dl>
            {current.issues.length > 0 && (
              <Notice>
                {current.issues.map((issue) => (
                  <p key={issue}>
                    {workbookIssueLabels[issue] || "Cần đối chiếu workbook"}
                  </p>
                ))}
              </Notice>
            )}
          </>
        )}
      </Modal>
    </>
  );
}
