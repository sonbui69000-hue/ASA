import { useState } from "react";
import { WorkbookDataPanel } from "./workbook-data";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Plus,
  Link2,
  PackageCheck,
  ShoppingCart,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { useDemo } from "../app/context";
import {
  Badge,
  Button,
  ConfirmAction,
  DataTable,
  Field,
  Modal,
  Notice,
  PageHeader,
  Panel,
  Tabs,
  Empty,
  ExportButton,
  exportCsv,
} from "../components/shared";
import {
  shortageRows,
  shortlist,
  purchasesFor,
  canApprove,
  reserveCap,
  canDepartment,
  stagesDone,
  purchaseReport,
} from "../domain/selectors";
import {
  money,
  genderLabels,
  statuses,
  type PurchaseContext,
  dateLabel,
  type PurchaseLine,
  type Purchase,
  type Order,
} from "../domain/types";
import { ApprovalTimeline } from "./work";
import { defaultPurchaseContext } from "../domain/uniform-attributes";
function PurchaseMetadata({ context }: { context: PurchaseContext }) {
  const { state: s } = useDemo();
  return (
    <Notice>
      <div>
        Ngân sách: {context.budgetName || "Chưa cập nhật"} • Mã:{" "}
        {context.budgetCode || "Chưa cập nhật"}
      </div>
      <div>
        Khoa/phòng hạch toán:{" "}
        {s.departments.find((d) => d.id === context.budgetDepartmentId)?.name ||
          "Chưa cập nhật"}{" "}
        • Tháng dự kiến mua: {context.purchaseMonth || "Chưa cập nhật"}
      </div>
    </Notice>
  );
}
function PurchaseForm({
  purchase,
  initial,
  onClose,
}: {
  purchase?: Purchase;
  initial?: PurchaseLine[];
  onClose: () => void;
}) {
  const { state: s, actor, act } = useDemo();
  const defaultLine = (): PurchaseLine => ({
    skuId: s.skus[0].id,
    quantity: 1,
    purpose: "reserve",
    sourceRequestId: "",
    productId:
      s.mappings.find((m) => m.skuId === s.skus[0].id)?.productId || "",
    price: s.skus[0].price,
  });
  const [lines, setLines] = useState<PurchaseLine[]>(
      purchase?.lines || initial || [defaultLine()],
    ),
    [note, setNote] = useState(purchase?.note || ""),
    [context, setContext] = useState<PurchaseContext>(
      purchase?.context || {
        ...defaultPurchaseContext(s, actor),
        budgetDepartmentId:
          s.uniforms.find((r) => r.id === initial?.[0]?.sourceRequestId)
            ?.departmentId || actor.departmentId,
      },
    );
  const update = (i: number, p: Partial<PurchaseLine>) =>
    setLines(lines.map((x, j) => (i === j ? { ...x, ...p } : x)));
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title={purchase ? "Chỉnh sửa đề nghị mua" : "Lập đề nghị mua sắm"}
      description="Đề nghị, duyệt, PO và phiếu nhận là các bước riêng. Chưa tăng kho khi lưu nháp."
      submitLabel="Lưu đề nghị nháp"
      wide
      onSubmit={() =>
        act(
          purchase
            ? { type: "purchase.edit", id: purchase.id, lines, note, context }
            : { type: "purchase.create", lines, note, context },
        )
      }
    >
      <Notice>
        Trần dự trữ hiện tại: <strong>{reserveCap(s)} bộ</strong> = floor(
        {s.readModel?.headcount ??
          s.employees.filter((e) => e.active).length}{" "}
        người × {s.settings.reserveRatio * 100}% × {s.settings.reserveSets}). Bổ
        sung thiếu có nguồn được tính riêng.
      </Notice>
      {lines.map((l, i) => (
        <div className="line-item" key={i}>
          <div className="line-heading">
            <strong>Dòng mua {i + 1}</strong>
            {lines.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLines(lines.filter((_, n) => n !== i))}
              >
                Xóa dòng mua {i + 1}
              </Button>
            )}
          </div>
          <div className="form-grid">
            <Field label={`Sản phẩm mua dòng ${i + 1}`}>
              <select
                value={l.skuId}
                required
                onChange={(e) => {
                  const x = s.skus.find((x) => x.id === e.target.value)!;
                  update(i, {
                    skuId: x.id,
                    productId:
                      s.mappings.find((m) => m.skuId === x.id)?.productId || "",
                    price: x.price,
                    sourceRequestId: "",
                    purpose: "reserve",
                  });
                }}
              >
                {s.skus
                  .filter((x) => x.active)
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.code} • {x.name} • {genderLabels[x.gender]}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label={`Mục đích dòng ${i + 1}`}>
              <select
                value={l.purpose}
                onChange={(e) =>
                  update(i, {
                    purpose: e.target.value as PurchaseLine["purpose"],
                    sourceRequestId: "",
                  })
                }
              >
                <option value="reserve">Mua dự trữ</option>
                <option value="shortage">Bổ sung thiếu</option>
              </select>
            </Field>
            <Field label={`Số bộ mua dòng ${i + 1}`}>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={l.quantity}
                onChange={(e) =>
                  update(i, { quantity: Number(e.target.value) })
                }
              />
            </Field>
            {l.purpose === "shortage" && (
              <Field label={`Nguồn thiếu dòng ${i + 1}`}>
                <select
                  required
                  value={l.sourceRequestId}
                  onChange={(e) =>
                    update(i, { sourceRequestId: e.target.value })
                  }
                >
                  <option value="">Chọn yêu cầu thiếu</option>
                  {shortageRows(s)
                    .filter((x) => x.skuId === l.skuId)
                    .map((x, n) => (
                      <option key={n} value={x.requestId}>
                        {x.requestId} • còn thiếu {x.quantity} bộ
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field label={`Mã nhà cung cấp dòng ${i + 1}`}>
              <select
                required
                value={l.productId}
                onChange={(e) =>
                  update(i, {
                    productId: e.target.value,
                    price:
                      s.supplierProducts.find((x) => x.id === e.target.value)
                        ?.price || 0,
                  })
                }
              >
                <option value="">Chọn mã NCC</option>
                {shortlist(s, l.skuId)
                  .filter((c) => c.score >= 80)
                  .map((c) => (
                    <option key={c.product.id} value={c.product.id}>
                      {c.product.code} • {c.product.supplier} • {c.score}%
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Giá tham chiếu">
              <input readOnly value={money(l.price)} />
            </Field>
          </div>
          <small>
            {s.mappings.some(
              (m) => m.skuId === l.skuId && m.productId === l.productId,
            )
              ? "Đối sánh đã được người mua xác nhận."
              : "Cần xác nhận đối sánh tại tab Mã nhà cung cấp trước khi gửi."}
          </small>
        </div>
      ))}
      <Button
        variant="outline"
        onClick={() => setLines([...lines, defaultLine()])}
      >
        <Plus size={16} />
        Thêm dòng mua
      </Button>
      <Field label="Diễn giải đề nghị">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="form-grid">
        <Field label="Ngân sách (mô tả demo)">
          <input
            value={context.budgetName}
            maxLength={120}
            onChange={(e) =>
              setContext({ ...context, budgetName: e.target.value })
            }
            placeholder="Ngân sách trang phục demo"
          />
        </Field>
        <Field label="Mã ngân sách demo">
          <input
            value={context.budgetCode}
            maxLength={60}
            onChange={(e) =>
              setContext({ ...context, budgetCode: e.target.value })
            }
            placeholder="DEMO-NS-HC-26"
          />
        </Field>
        <Field label="Khoa/phòng hạch toán">
          <select
            value={context.budgetDepartmentId}
            onChange={(e) =>
              setContext({ ...context, budgetDepartmentId: e.target.value })
            }
          >
            <option value="">Chưa cập nhật</option>
            {s.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tháng dự kiến mua">
          <input
            type="month"
            value={context.purchaseMonth}
            onChange={(e) =>
              setContext({ ...context, purchaseMonth: e.target.value })
            }
          />
        </Field>
      </div>
      <small>
        Metadata phục vụ tổng hợp, không tự quyết định hạn mức hoặc thay bước
        duyệt. Chỉ nhập dữ liệu hư cấu.
      </small>
    </Modal>
  );
}
function SupplierCatalog() {
  const { state: s, actor, act } = useDemo();
  const [sku, setSku] = useState(s.skus[0].id),
    [supplier, setSupplier] = useState(""),
    [category, setCategory] = useState(""),
    [gender, setGender] = useState(""),
    [query, setQuery] = useState("");
  const rows = shortlist(s, sku, query).filter(
    (x) =>
      (!supplier || x.product.supplier === supplier) &&
      (!category || x.product.category === category) &&
      (!gender || x.product.gender === gender),
  );
  return (
    <>
      <Panel
        title="Đối sánh mã nội bộ – mã nhà cung cấp"
        description="Điểm được tính cố định: loại 50, cỡ 30, chất liệu 20; người mua xác nhận trước sử dụng"
      >
        <div className="panel-body">
          <div className="form-grid">
            <Field label="Mã nội bộ cần đối sánh">
              <select value={sku} onChange={(e) => setSku(e.target.value)}>
                {s.skus.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.code} • {x.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tra theo mã SAP / tên sản phẩm">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SAP-A, bộ điều dưỡng…"
              />
            </Field>
            <Field label="Nhà cung cấp">
              <select
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              >
                <option value="">Tất cả nhà cung cấp</option>
                {[...new Set(s.supplierProducts.map((p) => p.supplier))].map(
                  (x) => (
                    <option key={x}>{x}</option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Giới tính mã NCC">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Tất cả</option>
                {(["unisex", "male", "female"] as const).map((g) => (
                  <option key={g} value={g}>
                    {genderLabels[g]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Loại sản phẩm NCC">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Tất cả loại</option>
                <option value="doctor">Bác sĩ</option>
                <option value="nurse">Điều dưỡng</option>
                <option value="technician">Kỹ thuật viên</option>
                <option value="office">Hành chính</option>
              </select>
            </Field>
          </div>
        </div>
        <DataTable
          rows={rows}
          caption="Đối sánh nhà cung cấp"
          columns={[
            {
              key: "code",
              label: "Mã SAP mô phỏng / NCC",
              sort: (x) => x.product.code,
              render: (x) => (
                <>
                  <strong>{x.product.code}</strong>
                  <small>{x.product.supplier}</small>
                </>
              ),
            },
            {
              key: "product",
              label: "Tên / thông số",
              render: (x) => (
                <>
                  {x.product.name}
                  <small>
                    Cỡ {x.product.size} · {x.product.material}
                  </small>
                </>
              ),
            },
            {
              key: "score",
              label: "Điểm & lý do",
              sort: (x) => x.score,
              render: (x) => (
                <>
                  <Badge status={x.score === 100 ? "approved" : "pending"}>
                    {x.score}% phù hợp
                  </Badge>
                  <small>{x.reasons.join(" · ")}</small>
                </>
              ),
            },
            {
              key: "price",
              label: "Đơn giá",
              render: (x) => money(x.product.price),
            },
            {
              key: "confirm",
              label: "Xác nhận của người mua",
              render: (x) =>
                s.mappings.some(
                  (m) => m.skuId === sku && m.productId === x.product.id,
                ) ? (
                  <Badge status="approved">Đã đối chiếu</Badge>
                ) : actor.role === "buyer" ? (
                  <ConfirmAction
                    label="Xác nhận đối sánh"
                    reason
                    disabled={x.score < 80}
                    description="Kiểm tra loại, cỡ, chất liệu và ghi lý do chấp nhận khác biệt. AI không tự chốt mã."
                    onConfirm={(reason) =>
                      act({
                        type: "mapping.confirm",
                        skuId: sku,
                        productId: x.product.id,
                        reason,
                      })
                    }
                  />
                ) : (
                  <small>Chọn tài khoản Mua sắm để xác nhận</small>
                ),
            },
          ]}
        />
      </Panel>
      <Notice>
        Danh mục SAP và tất cả nhà cung cấp đều hư cấu. Không gọi API hoặc kiểm
        chứng kết nối SAP thật.
      </Notice>
    </>
  );
}
function ReceiptForm({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { state: s, act } = useDemo();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(
      order.lines.map((l) => [l.skuId, l.quantity - l.received]),
    ),
  );
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title="Xác nhận nhận hàng"
      description={`${order.id} • Mỗi phiếu nhận sẽ tăng kho đúng một lần.`}
      submitLabel="Xác nhận nhận và tăng kho"
      onSubmit={() => act({ type: "receipt", id: order.id, quantities })}
    >
      {order.lines.map((l) => (
        <div className="line-item" key={l.skuId}>
          <strong>{s.skus.find((x) => x.id === l.skuId)?.code}</strong>
          <p className="helper">
            Đặt {l.quantity} • Đã nhận {l.received} • Còn{" "}
            {l.quantity - l.received}
          </p>
          <Field
            label={"Số bộ nhận " + s.skus.find((x) => x.id === l.skuId)?.code}
          >
            <input
              type="number"
              min="0"
              max={l.quantity - l.received}
              step="1"
              value={quantities[l.skuId]}
              onChange={(e) =>
                setQuantities({
                  ...quantities,
                  [l.skuId]: Number(e.target.value),
                })
              }
            />
          </Field>
        </div>
      ))}
      <Notice>
        Kiểm tra thực tế mô phỏng trước xác nhận. PO không được nhận quá lượng
        đã đặt.
      </Notice>
    </Modal>
  );
}
function PurchaseSummary() {
  const { state: s, actor } = useDemo();
  const [departmentId, setDepartment] = useState(""),
    [month, setMonth] = useState(""),
    [budget, setBudget] = useState("");
  const rows = purchaseReport(s, actor, { departmentId, month, budget });
  return (
    <>
      <div className="filter-row">
        <Field label="Khoa/phòng tổng hợp mua">
          <select
            value={departmentId}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="">Tất cả được phép</option>
            {s.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tháng tổng hợp mua">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </Field>
        <Field label="Tìm mã hoặc tên ngân sách">
          <input value={budget} onChange={(e) => setBudget(e.target.value)} />
        </Field>
      </div>
      <div className="summary-strip">
        <span>
          Giá trị đề nghị (gồm nháp):{" "}
          <strong>{money(rows.reduce((n, r) => n + r.total, 0))}</strong>
        </span>
        <span>
          Giá trị hàng đã nhận:{" "}
          <strong>
            {money(rows.reduce((n, r) => n + r.receivedValue, 0))}
          </strong>
        </span>
      </div>
      <Panel
        title="Tổng hợp mua theo khoa, tháng và ngân sách"
        description="Tháng dự kiến thuộc đề nghị. Đã nhận tính theo PO/giá chụp, không dùng giá danh mục hiện tại."
        action={
          <ExportButton
            onClick={() =>
              exportCsv(
                "tong-hop-mua-demo.csv",
                [
                  "PR",
                  "Khoa hạch toán",
                  "Tháng dự kiến",
                  "Ngân sách",
                  "Mã ngân sách",
                  "Trạng thái",
                  "Số bộ",
                  "Giá trị đề nghị",
                  "Giá trị đã nhận",
                ],
                rows.map((r) => [
                  r.purchase.id,
                  s.departments.find(
                    (d) => d.id === r.purchase.context.budgetDepartmentId,
                  )?.name || "",
                  r.purchase.context.purchaseMonth,
                  r.purchase.context.budgetName,
                  r.purchase.context.budgetCode,
                  statuses[r.purchase.status],
                  r.quantity,
                  r.total,
                  r.receivedValue,
                ]),
              )
            }
          />
        }
      >
        <DataTable
          caption="Tổng hợp mua"
          rows={rows.map((r) => ({ ...r, id: r.purchase.id }))}
          columns={[
            { key: "id", label: "Đề nghị", render: (r) => r.purchase.id },
            {
              key: "context",
              label: "Khoa / tháng",
              render: (r) => (
                <>
                  {s.departments.find(
                    (d) => d.id === r.purchase.context.budgetDepartmentId,
                  )?.name || "Chưa cập nhật"}
                  <small>
                    {r.purchase.context.purchaseMonth || "Chưa cập nhật"}
                  </small>
                </>
              ),
            },
            {
              key: "budget",
              label: "Ngân sách",
              render: (r) => (
                <>
                  {r.purchase.context.budgetName || "Chưa cập nhật"}
                  <small>{r.purchase.context.budgetCode}</small>
                </>
              ),
            },
            {
              key: "status",
              label: "Trạng thái",
              render: (r) => <Badge status={r.purchase.status} />,
            },
            {
              key: "quantity",
              label: "Số bộ",
              sort: (r) => r.quantity,
              render: (r) => r.quantity,
            },
            {
              key: "total",
              label: "Giá trị đề nghị",
              sort: (r) => r.total,
              render: (r) => money(r.total),
            },
            {
              key: "received",
              label: "Giá trị đã nhận",
              render: (r) => money(r.receivedValue),
            },
          ]}
        />
      </Panel>
    </>
  );
}
export function PurchasesPage() {
  const { state: s, actor, act } = useDemo();
  const nav = useNavigate(),
    loc = useLocation(),
    { id } = useParams();
  const tab = loc.pathname.includes("du-lieu-excel")
    ? "du-lieu-excel"
    : loc.pathname.includes("bao-cao")
      ? "bao-cao"
      : loc.pathname.includes("nhu-cau")
        ? "nhu-cau"
        : loc.pathname.includes("nha-cung-cap")
          ? "nha-cung-cap"
          : loc.pathname.includes("don-hang")
            ? "don-hang"
            : "de-nghi";
  const [form, setForm] = useState<{
      purchase?: Purchase;
      initial?: PurchaseLine[];
    } | null>(null),
    [receipt, setReceipt] = useState<Order | null>(null);
  const purchases = purchasesFor(s, actor),
    p = purchases.find((p) => p.id === id),
    order = s.orders.find(
      (o) => o.id === id && purchases.some((p) => p.id === o.purchaseId),
    );
  const needs = shortageRows(s).filter((x) =>
    canDepartment(actor, x.departmentId),
  );
  const canDraft = ["buyer", "admin", "coordinator"].includes(actor.role);
  return (
    <>
      <PageHeader
        eyebrow="CUNG ỨNG / MUA SẮM"
        title="Hỗ trợ mua sắm"
        description="Từ thiếu hụt thực tế đến đề nghị, phê duyệt, đặt hàng và nhập kho."
        action={
          canDraft ? (
            <Button onClick={() => setForm({})}>
              <Plus size={17} />
              Lập đề nghị mua
            </Button>
          ) : undefined
        }
      />
      <div className="sap-status">
        <span className="online-dot" />
        <strong>SAP mô phỏng cục bộ</strong>
        <span>Danh mục và PO demo • Không có kết nối thật</span>
        {s.settings.sapFailure && (
          <Badge status="rejected">Kịch bản lỗi đang bật</Badge>
        )}
      </div>
      <Tabs
        value={tab}
        onChange={(v) => nav("/mua-sam/" + v)}
        tabs={[
          { id: "nhu-cau", label: "Nhu cầu bổ sung", count: needs.length },
          { id: "de-nghi", label: "Đề nghị mua", count: purchases.length },
          { id: "don-hang", label: "Đơn hàng & nhận hàng" },
          { id: "nha-cung-cap", label: "Mã nhà cung cấp" },
          { id: "bao-cao", label: "Tổng hợp mua" },
          ...(s.workbookData
            ? [
                {
                  id: "du-lieu-excel",
                  label: "Dữ liệu Excel",
                  count: s.workbookData.uniformPurchases.length,
                },
              ]
            : []),
        ]}
      />
      {tab === "du-lieu-excel" ? (
        <WorkbookDataPanel kind="purchases" />
      ) : tab === "bao-cao" ? (
        <PurchaseSummary />
      ) : tab === "nha-cung-cap" ? (
        <SupplierCatalog />
      ) : tab === "nhu-cau" ? (
        <Panel
          title="Thiếu hụt chưa được cam kết mua"
          description="Không tính trùng các phần đã có đề nghị gửi duyệt hoặc PO đang xử lý"
        >
          <DataTable
            rows={needs}
            caption="Nhu cầu bổ sung"
            columns={[
              {
                key: "source",
                label: "Nguồn nhu cầu",
                render: (x) => (
                  <>
                    <strong>{x.requestId}</strong>
                    <small>
                      {s.departments.find((d) => d.id === x.departmentId)?.name}
                    </small>
                  </>
                ),
              },
              {
                key: "code",
                label: "Mã / cỡ",
                render: (x) => s.skus.find((k) => k.id === x.skuId)?.code,
              },
              {
                key: "qty",
                label: "Còn thiếu",
                render: (x) => (
                  <strong className="text-warning">{x.quantity} bộ</strong>
                ),
              },
              {
                key: "action",
                label: "Đề nghị bổ sung",
                render: (x) =>
                  canDraft ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setForm({
                          initial: [
                            {
                              skuId: x.skuId,
                              quantity: x.quantity,
                              purpose: "shortage",
                              sourceRequestId: x.requestId,
                              productId:
                                s.mappings.find((m) => m.skuId === x.skuId)
                                  ?.productId || "",
                              price: s.skus.find((k) => k.id === x.skuId)!
                                .price,
                            },
                          ],
                        })
                      }
                    >
                      Tạo bản nháp mua
                      <ArrowRight size={15} />
                    </Button>
                  ) : null,
              },
            ]}
          />
        </Panel>
      ) : tab === "don-hang" ? (
        <Panel
          title="Đơn hàng SAP mô phỏng"
          description="Tạo đơn không thay đổi tồn; phiếu nhận hàng mới tăng kho"
        >
          <DataTable
            rows={s.orders.filter((o) =>
              purchases.some((p) => p.id === o.purchaseId),
            )}
            caption="Đơn đặt hàng"
            searchText={(o) => o.id + " " + o.supplier}
            columns={[
              {
                key: "id",
                label: "PO / đề nghị",
                sort: (o) => o.id,
                render: (o) => (
                  <>
                    <strong>{o.id}</strong>
                    <small>{o.purchaseId}</small>
                  </>
                ),
              },
              {
                key: "supplier",
                label: "Nhà cung cấp",
                render: (o) => o.supplier,
              },
              {
                key: "quantity",
                label: "Đặt / đã nhận",
                render: (o) =>
                  o.lines.reduce((n, l) => n + l.quantity, 0) +
                  " / " +
                  o.lines.reduce((n, l) => n + l.received, 0) +
                  " bộ",
              },
              {
                key: "status",
                label: "Trạng thái",
                render: (o) => <Badge status={o.status} />,
              },
              {
                key: "action",
                label: "Hồ sơ",
                render: (o) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nav("/mua-sam/don-hang/" + o.id)}
                  >
                    Xem đơn hàng
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
      ) : (
        <Panel
          title="Danh sách đề nghị mua"
          description="Một nhà cung cấp mỗi đề nghị; quy trình duyệt được chụp tại lúc gửi"
        >
          <DataTable
            rows={purchases}
            caption="Đề nghị mua sắm"
            searchText={(p) => p.id + " " + p.note + " " + p.supplier}
            columns={[
              {
                key: "id",
                label: "Mã / ngày",
                sort: (p) => p.id,
                render: (p) => (
                  <>
                    <strong>{p.id}</strong>
                    <small>{dateLabel(p.date)}</small>
                  </>
                ),
              },
              {
                key: "supplier",
                label: "Nhà cung cấp",
                render: (p) => p.supplier || "Chưa chọn",
              },
              {
                key: "qty",
                label: "Số bộ / giá trị",
                render: (p) => (
                  <>
                    {p.lines.reduce((n, l) => n + l.quantity, 0)} bộ
                    <small>
                      {money(
                        p.lines.reduce((n, l) => n + l.quantity * l.price, 0),
                      )}
                    </small>
                  </>
                ),
              },
              {
                key: "status",
                label: "Trạng thái",
                render: (p) => <Badge status={p.status} />,
              },
              {
                key: "action",
                label: "Hồ sơ",
                render: (p) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nav("/mua-sam/de-nghi/" + p.id)}
                  >
                    Xem đề nghị
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
      )}
      {form && <PurchaseForm {...form} onClose={() => setForm(null)} />}
      <Modal
        open={!!id}
        onOpenChange={(v) => !v && nav("/mua-sam/" + tab)}
        title={p?.id || order?.id || "Không có quyền mở hồ sơ"}
        description="Hồ sơ mua sắm và tích hợp SAP hoàn toàn mô phỏng."
        wide
      >
        {p ? (
          <>
            <div className="detail-meta">
              <Badge status={p.status} />
              <span>{p.supplier}</span>
            </div>
            <p>{p.note}</p>
            <PurchaseMetadata context={p.context} />
            <Notice>
              Trần dự trữ khi gửi: {p.reserveLimit} bộ, quân số {p.headcount}.
              Hiện tại cấu hình cho phép {reserveCap(s)} bộ ở đề nghị mới.
            </Notice>
            <DataTable
              rows={p.lines}
              caption="Dòng đề nghị mua"
              columns={[
                {
                  key: "sku",
                  label: "Mã nội bộ",
                  render: (l) => s.skus.find((x) => x.id === l.skuId)?.code,
                },
                {
                  key: "purpose",
                  label: "Mục đích / nguồn",
                  render: (l) => (
                    <>
                      {l.purpose === "reserve" ? "Dự trữ" : "Bổ sung thiếu"}
                      <small>{l.sourceRequestId}</small>
                    </>
                  ),
                },
                { key: "quantity", label: "Số bộ", render: (l) => l.quantity },
                {
                  key: "code",
                  label: "Mã NCC",
                  render: (l) =>
                    s.supplierProducts.find((x) => x.id === l.productId)?.code,
                },
                {
                  key: "price",
                  label: "Đơn giá chụp",
                  render: (l) => money(l.price),
                },
              ]}
            />
            <ApprovalTimeline record={p} />
            <div className="actions wrap">
              {actor.role === "buyer" &&
                ["draft", "rejected"].includes(p.status) && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setForm({ purchase: p });
                        nav("/mua-sam/de-nghi");
                      }}
                    >
                      Sửa đề nghị
                    </Button>
                    <ConfirmAction
                      label="Gửi duyệt đề nghị"
                      variant="default"
                      description="Kiểm tra mã NCC, phần thiếu và trần mua dự trữ trước gửi."
                      onConfirm={() =>
                        act({ type: "purchase.submit", id: p.id })
                      }
                    />
                  </>
                )}
              {canApprove(actor, p, s) && (
                <>
                  <ConfirmAction
                    label="Duyệt đề nghị"
                    variant="default"
                    description="Xác nhận bước đang đến lượt bạn. Chưa tạo PO hoặc tăng kho."
                    onConfirm={(reason) =>
                      act({
                        type: "approve",
                        entity: "purchase",
                        id: p.id,
                        approved: true,
                        reason,
                      })
                    }
                  />
                  <ConfirmAction
                    label="Từ chối đề nghị"
                    reason
                    variant="destructive"
                    description="Ghi lý do và trả hồ sơ về người lập."
                    onConfirm={(reason) =>
                      act({
                        type: "approve",
                        entity: "purchase",
                        id: p.id,
                        approved: false,
                        reason,
                      })
                    }
                  />
                </>
              )}
              {p.status === "approved" && actor.role === "buyer" && (
                <ConfirmAction
                  label="Tạo PO SAP mô phỏng"
                  variant="default"
                  description="Chỉ tạo mã PO local, chưa nhận hàng hay tăng kho; không gọi SAP thật."
                  onConfirm={() => act({ type: "purchase.order", id: p.id })}
                />
              )}{" "}
              {!["ordered", "cancelled"].includes(p.status) &&
                ["buyer", "admin"].includes(actor.role) && (
                  <ConfirmAction
                    label="Hủy đề nghị"
                    description="Giải phóng phần thiếu đang cam kết mua; không hủy PO đã đặt."
                    onConfirm={() => act({ type: "purchase.cancel", id: p.id })}
                  />
                )}
            </div>
          </>
        ) : order ? (
          <>
            <div className="detail-meta">
              <Badge status={order.status} />
              <span>{order.supplier}</span>
              <span>{order.purchaseId}</span>
            </div>
            <PurchaseMetadata context={order.context} />
            <DataTable
              rows={order.lines}
              caption="Dòng PO"
              columns={[
                {
                  key: "code",
                  label: "Mã nội bộ",
                  render: (l) => s.skus.find((x) => x.id === l.skuId)?.code,
                },
                { key: "ordered", label: "Đã đặt", render: (l) => l.quantity },
                {
                  key: "received",
                  label: "Đã nhận",
                  render: (l) => l.received,
                },
                {
                  key: "remaining",
                  label: "Còn nhận",
                  render: (l) => l.quantity - l.received,
                },
                {
                  key: "price",
                  label: "Đơn giá",
                  render: (l) => money(l.price),
                },
              ]}
            />
            {actor.role === "warehouse" && order.status !== "received" && (
              <Button
                onClick={() => {
                  setReceipt(order);
                  nav("/mua-sam/don-hang");
                }}
              >
                <PackageCheck size={17} />
                Lập phiếu nhận hàng
              </Button>
            )}
            <Panel title="Lịch sử nhận hàng">
              <div className="panel-body">
                {s.receipts.filter((r) => r.orderId === order.id).length ? (
                  s.receipts
                    .filter((r) => r.orderId === order.id)
                    .map((r) => (
                      <p key={r.id}>
                        {r.id} • {dateLabel(r.date)} •{" "}
                        {r.lines.reduce((n, l) => n + l.quantity, 0)} bộ → kho
                        trung tâm
                      </p>
                    ))
                ) : (
                  <p className="helper">
                    Chưa có phiếu nhận. Tồn kho chưa thay đổi do PO này.
                  </p>
                )}
              </div>
            </Panel>
          </>
        ) : (
          <Notice danger>Hồ sơ không tồn tại hoặc nằm ngoài quyền.</Notice>
        )}
      </Modal>
      {receipt && (
        <ReceiptForm
          order={s.orders.find((o) => o.id === receipt.id)!}
          onClose={() => setReceipt(null)}
        />
      )}
    </>
  );
}
