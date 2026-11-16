import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import {
  Plus,
  Shirt,
  Package,
  Users,
  BarChart3,
  AlertTriangle,
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
  ExportButton,
  exportCsv,
} from "../components/shared";
import {
  stock,
  issued,
  committed,
  employeesFor,
  requestsFor,
  canApprove,
  canDepartment,
  lastIssuedDate,
  linkedPurchases,
} from "../domain/selectors";
import {
  jobLabels,
  genderLabels,
  money,
  dateLabel,
  roleLabels,
  type Line,
  type UniformRequest,
  type Sku,
} from "../domain/types";
import { ApprovalTimeline } from "./work";
import { WorkbookDataPanel } from "./workbook-data";
import { eligibleSku, normalizeSize } from "../domain/uniform-attributes";

function RequestForm({
  request,
  onClose,
}: {
  request?: UniformRequest;
  onClose: () => void;
}) {
  const { state: s, actor, act } = useDemo();
  const [department, setDepartment] = useState(
      request?.departmentId || actor.departmentId,
    ),
    [lines, setLines] = useState<Line[]>(
      request?.lines || [{ employeeId: "", skuId: "", quantity: 1 }],
    ),
    [note, setNote] = useState(request?.note || ""),
    [exception, setException] = useState(request?.exceptionReason || "");
  function update(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  }
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title={request ? "Chỉnh sửa yêu cầu" : "Lập yêu cầu đồng phục"}
      description="Chọn người nhận, loại và cỡ. Bản nháp chưa cam kết định mức hoặc giữ hàng."
      wide
      submitLabel="Lưu bản nháp"
      onSubmit={async () => {
        if (request)
          await act({
            type: "uniform.edit",
            id: request.id,
            lines,
            note,
            exceptionReason: exception,
          });
        else
          await act({
            type: "uniform.create",
            departmentId: department,
            lines,
            note,
            exceptionReason: exception,
          });
      }}
    >
      <Field label="Khoa / phòng đề nghị">
        <select
          value={department}
          disabled={!!request}
          onChange={(e) => {
            setDepartment(e.target.value);
            setLines([{ employeeId: "", skuId: "", quantity: 1 }]);
          }}
        >
          {s.departments
            .filter((d) => canDepartment(actor, d.id))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
        </select>
      </Field>
      {lines.map((l, i) => {
        const emp = s.employees.find((e) => e.id === l.employeeId);
        return (
          <div className="line-item" key={i}>
            <div className="line-heading">
              <strong>Dòng {i + 1}</strong>
              {lines.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLines(lines.filter((_, n) => n !== i))}
                >
                  Xóa dòng {i + 1}
                </Button>
              )}
            </div>
            <div className="form-grid">
              <Field label={`Nhân viên dòng ${i + 1}`}>
                <select
                  required
                  value={l.employeeId}
                  onChange={(e) =>
                    update(i, { employeeId: e.target.value, skuId: "" })
                  }
                >
                  <option value="">Chọn nhân viên</option>
                  {s.employees
                    .filter((e) => e.departmentId === department && e.active)
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name} • {jobLabels[e.job]} • {genderLabels[e.gender]}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={`Mã đồng phục dòng ${i + 1}`}>
                <select
                  required
                  value={l.skuId}
                  onChange={(e) => update(i, { skuId: e.target.value })}
                >
                  <option value="">Chọn loại và cỡ</option>
                  {s.skus
                    .filter((x) => emp && eligibleSku(x, emp))
                    .map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.code} • {genderLabels[x.gender]} •{" "}
                        {stock(s, x.id).available} bộ khả dụng
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={`Số bộ dòng ${i + 1}`}>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={l.quantity}
                  onChange={(e) =>
                    update(i, { quantity: Number(e.target.value) })
                  }
                />
              </Field>
            </div>
            {emp && (
              <p className="helper">
                {emp.id} · Đã cấp {issued(s, emp.id)} · Đang cam kết{" "}
                {committed(s, emp.id, undefined, request?.id)} · Định mức{" "}
                {s.settings.annualLimit} bộ/năm
              </p>
            )}
          </div>
        );
      })}
      <Button
        variant="outline"
        onClick={() =>
          setLines([...lines, { employeeId: "", skuId: "", quantity: 1 }])
        }
      >
        <Plus size={16} />
        Thêm dòng đồng phục
      </Button>
      <Field label="Ghi chú nhu cầu">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Field
        label="Lý do ngoại lệ định mức (nếu có)"
        hint="Ít nhất 10 ký tự. Có lý do ngoại lệ sẽ thêm bước Lãnh đạo; không tự cấp vượt hạn mức."
      >
        <textarea
          value={exception}
          onChange={(e) => setException(e.target.value)}
        />
      </Field>
    </Modal>
  );
}

function Inventory() {
  const { state: s, actor, act } = useDemo();
  const location = useLocation(),
    navigate = useNavigate(),
    sourceParams = new URLSearchParams(location.search),
    sourceSku = sourceParams.get("sku");
  useEffect(() => {
    const warehouse = new URLSearchParams(location.search).get("warehouse");
    if (warehouse === "TT" || warehouse === "NOI") setDepartment(warehouse);
    setSize("");
    setGender("");
  }, [location.search]);
  const [department, setDepartment] = useState("TT"),
    [size, setSize] = useState(""),
    [gender, setGender] = useState(""),
    [edit, setEdit] = useState<Sku | null>(null),
    [add, setAdd] = useState(false),
    [adjust, setAdjust] = useState<Sku | null>(null);
  const [values, setValues] = useState({
    code: "",
    name: "",
    category: "nurse" as Sku["category"],
    size: "M",
    gender: "unisex" as Sku["gender"],
    price: 300000,
    minStock: 5,
    active: true,
  });
  const [qty, setQty] = useState(1),
    [price, setPrice] = useState(300000),
    [reason, setReason] = useState("");
  const low = s.skus.filter(
    (x) => x.active && stock(s, x.id, department).available < x.minStock,
  );
  return (
    <>
      {sourceSku && (
        <Notice>
          Đang xem nguồn:{" "}
          {s.skus.find((x) => x.id === sourceSku)?.code ||
            "Mã sản phẩm không còn khả dụng"}
          .{" "}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(location.pathname)}
          >
            Xóa bộ lọc nguồn
          </Button>
        </Notice>
      )}
      <div className="filter-row">
        <Field label="Kho hàng">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="TT">Kho trung tâm • Hành chính</option>
            <option value="NOI">Kho khoa Nội</option>
          </select>
        </Field>
        <Field label="Cỡ đồng phục">
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Tất cả cỡ</option>
            {[...new Set(s.skus.map((x) => normalizeSize(x.size)))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Biến thể giới tính">
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Tất cả biến thể</option>
            {(["unisex", "male", "female"] as const).map((g) => (
              <option key={g} value={g}>
                {genderLabels[g]}
              </option>
            ))}
          </select>
        </Field>
        {["warehouse", "sysadmin"].includes(actor.role) && (
          <Button
            onClick={() => {
              setValues({
                code: "",
                name: "",
                category: "nurse",
                size: "XXL",
                gender: "unisex",
                price: 300000,
                minStock: 5,
                active: true,
              });
              setAdd(true);
            }}
          >
            <Plus size={16} />
            Thêm mã hàng
          </Button>
        )}
      </div>
      {low.length > 0 && (
        <Notice>
          <strong>{low.length} mã dưới ngưỡng tồn.</strong> Tồn khả dụng không
          bao gồm hàng đã được duyệt giữ. Nhập hàng hoặc đề nghị mua bổ sung để
          đáp ứng nhu cầu.
        </Notice>
      )}
      <Panel
        title="Danh mục và tồn kho"
        description="Một mã hàng = loại, giới tính và một cỡ • Đơn vị: bộ • 2XL tương đương XXL"
      >
        <DataTable
          caption="Danh mục đồng phục"
          rows={s.skus.filter(
            (x) =>
              (!sourceSku || x.id === sourceSku) &&
              (!size || normalizeSize(x.size) === size) &&
              (!gender || x.gender === gender),
          )}
          searchText={(x) =>
            `${x.code} ${x.name} ${genderLabels[x.gender]} ${x.size}`
          }
          columns={[
            {
              key: "code",
              label: "Mã / sản phẩm",
              sort: (x) => x.code,
              render: (x) => (
                <>
                  <strong>{x.code}</strong>
                  <small>{x.name}</small>
                </>
              ),
            },
            {
              key: "size",
              label: "Cỡ / chức danh",
              sort: (x) => x.size,
              render: (x) => (
                <>
                  {x.size}
                  <small>{jobLabels[x.category]}</small>
                  <small>{genderLabels[x.gender]}</small>
                </>
              ),
            },
            {
              key: "price",
              label: "Đơn giá hiện tại",
              sort: (x) => x.price,
              render: (x) => money(x.price),
            },
            {
              key: "physical",
              label: "Vật lý",
              sort: (x) => stock(s, x.id, department).physical,
              render: (x) => stock(s, x.id, department).physical,
            },
            {
              key: "held",
              label: "Đang giữ",
              render: (x) => stock(s, x.id, department).held,
            },
            {
              key: "available",
              label: "Khả dụng",
              sort: (x) => stock(s, x.id, department).available,
              render: (x) => (
                <span
                  className={
                    stock(s, x.id, department).available < x.minStock
                      ? "text-warning"
                      : "text-success"
                  }
                >
                  {stock(s, x.id, department).available} bộ
                </span>
              ),
            },
            {
              key: "active",
              label: "Trạng thái",
              render: (x) => (
                <Badge status={x.active ? "published" : "cancelled"}>
                  {x.active ? "Đang sử dụng" : "Ngừng dùng"}
                </Badge>
              ),
            },
            {
              key: "actions",
              label: "Thao tác",
              render: (x) => (
                <div className="actions">
                  {["warehouse", "sysadmin"].includes(actor.role) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEdit(x);
                        setValues(x);
                      }}
                    >
                      Sửa mã
                    </Button>
                  )}
                  {actor.role === "warehouse" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAdjust(x);
                        setQty(1);
                        setPrice(x.price);
                        setReason("");
                      }}
                    >
                      Điều chỉnh kho
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Panel>
      <Panel
        title="Lịch sử biến động kho"
        description="Điều chỉnh kiểm kê, bàn giao và phiếu nhận đều có nguồn đối chiếu"
      >
        <DataTable
          rows={[...s.movements]
            .reverse()
            .filter((m) =>
              s.lots.some(
                (l) => l.id === m.lotId && l.warehouse === department,
              ),
            )}
          caption="Biến động kho"
          searchText={(m) =>
            `${m.reason} ${m.source} ${s.skus.find((x) => x.id === s.lots.find((l) => l.id === m.lotId)?.skuId)?.code}`
          }
          columns={[
            {
              key: "date",
              label: "Ngày",
              sort: (m) => m.date,
              render: (m) => dateLabel(m.date),
            },
            {
              key: "sku",
              label: "Mã hàng",
              render: (m) =>
                s.skus.find(
                  (x) => x.id === s.lots.find((l) => l.id === m.lotId)?.skuId,
                )?.code,
            },
            {
              key: "qty",
              label: "Số bộ",
              render: (m) => (
                <strong
                  className={m.quantity > 0 ? "text-success" : "text-warning"}
                >
                  {m.quantity > 0 ? "+" : ""}
                  {m.quantity}
                </strong>
              ),
            },
            {
              key: "reason",
              label: "Nghiệp vụ",
              render: (m) => (
                <>
                  {m.reason}
                  <small>{m.source}</small>
                </>
              ),
            },
          ]}
        />
      </Panel>
      {(edit || add) && (
        <Modal
          open
          onOpenChange={(v) => {
            if (!v) {
              setEdit(null);
              setAdd(false);
            }
          }}
          title={edit ? "Cập nhật mã đồng phục" : "Thêm mã đồng phục"}
          submitLabel="Xác nhận lưu"
          onSubmit={() => act({ type: "sku.save", id: edit?.id, ...values })}
        >
          <div className="form-grid">
            <Field label="Mã sản phẩm">
              <input
                required
                value={values.code}
                onChange={(e) => setValues({ ...values, code: e.target.value })}
              />
            </Field>
            <Field label="Tên sản phẩm">
              <input
                required
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
              />
            </Field>
            <Field label="Loại chức danh">
              <select
                disabled={!!edit}
                value={values.category}
                onChange={(e) =>
                  setValues({
                    ...values,
                    category: e.target.value as Sku["category"],
                  })
                }
              >
                {Object.entries(jobLabels).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cỡ">
              <input
                required
                disabled={!!edit}
                value={values.size}
                onChange={(e) => setValues({ ...values, size: e.target.value })}
              />
            </Field>
            <Field label="Giới tính của biến thể">
              <select
                disabled={!!edit}
                value={values.gender}
                onChange={(e) =>
                  setValues({
                    ...values,
                    gender: e.target.value as Sku["gender"],
                  })
                }
              >
                {(["unisex", "male", "female"] as const).map((g) => (
                  <option key={g} value={g}>
                    {genderLabels[g]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Giá hiện tại (VND)">
              <input
                type="number"
                required
                min="0"
                value={values.price}
                onChange={(e) =>
                  setValues({ ...values, price: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Ngưỡng tồn thấp">
              <input
                type="number"
                required
                min="0"
                value={values.minStock}
                onChange={(e) =>
                  setValues({ ...values, minStock: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={values.active}
              onChange={(e) =>
                setValues({ ...values, active: e.target.checked })
              }
            />
            Mã đang sử dụng
          </label>
          <Notice>
            Giá mới áp dụng danh mục hiện tại. Giá lô và giá lịch sử cấp phát
            được giữ nguyên.
          </Notice>
        </Modal>
      )}
      {adjust && (
        <Modal
          open
          onOpenChange={(v) => !v && setAdjust(null)}
          title={"Điều chỉnh kho • " + adjust.code}
          description="Nghiệp vụ kiểm kê mô phỏng, có lý do và nhật ký; không thay cho nhận hàng PO."
          submitLabel="Xác nhận điều chỉnh"
          onSubmit={() =>
            act({
              type: "stock.adjust",
              skuId: adjust.id,
              quantity: qty,
              price,
              reason,
              warehouse: department,
            })
          }
        >
          <Field label="Số bộ điều chỉnh (+ tăng, − giảm)">
            <input
              required
              type="number"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
          </Field>
          <Field label="Giá lô khi tăng kho (VND)">
            <input
              type="number"
              required
              min="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </Field>
          <Field label="Lý do kiểm kê">
            <textarea
              required
              minLength={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </Modal>
      )}
    </>
  );
}

function Employees() {
  const { state: s, actor, act } = useDemo();
  const location = useLocation(),
    navigate = useNavigate();
  const [id, setId] = useState(
    () => new URLSearchParams(location.search).get("employee") || "",
  );
  useEffect(
    () => setId(new URLSearchParams(location.search).get("employee") || ""),
    [location.search],
  );
  const employee = employeesFor(s, actor).find((e) => e.id === id);
  return (
    <>
      {id && !employee && (
        <Notice danger>
          Hồ sơ nhân viên không khả dụng trong phạm vi được phép.
        </Notice>
      )}
      <Panel
        title="Danh bạ nhân viên"
        description="Nhân viên tổng hợp, cùng dữ liệu với cấp phát, tủ đồ và quân số mua dự trữ"
      >
        <DataTable
          caption="Nhân viên"
          rows={employeesFor(s, actor)}
          searchText={(e) => e.id + " " + e.name + " " + jobLabels[e.job]}
          columns={[
            {
              key: "name",
              label: "Nhân viên",
              sort: (e) => e.name,
              render: (e) => (
                <>
                  <strong>{e.name}</strong>
                  <small>{e.id}</small>
                </>
              ),
            },
            {
              key: "dept",
              label: "Khoa / phòng",
              render: (e) =>
                s.departments.find((d) => d.id === e.departmentId)?.name,
            },
            {
              key: "job",
              label: "Chức danh",
              sort: (e) => e.job,
              render: (e) => jobLabels[e.job],
            },
            {
              key: "used",
              label: "Đã cấp / cam kết",
              render: (e) => `${issued(s, e.id)} / ${committed(s, e.id)} bộ`,
            },
            {
              key: "gender",
              label: "Giới tính",
              render: (e) => genderLabels[e.gender],
            },
            {
              key: "last",
              label: "Ngày cấp gần nhất",
              render: (e) =>
                lastIssuedDate(s, e.id)
                  ? dateLabel(lastIssuedDate(s, e.id))
                  : "Chưa có lịch sử",
            },
            {
              key: "remaining",
              label: "Còn theo định mức",
              render: (e) =>
                Math.max(
                  0,
                  s.settings.annualLimit - issued(s, e.id) - committed(s, e.id),
                ) + " bộ",
            },
            {
              key: "action",
              label: "Hồ sơ",
              render: (e) => (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigate(
                      location.pathname +
                        "?employee=" +
                        encodeURIComponent(e.id),
                    )
                  }
                >
                  Lịch sử cấp
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      {employee && (
        <Modal
          open
          onOpenChange={(v) => {
            if (!v) {
              setId("");
              navigate(location.pathname);
            }
          }}
          title={employee.name}
          description={`${employee.id} • ${jobLabels[employee.job]} • Định mức ${s.settings.annualLimit} bộ/năm`}
          wide
        >
          <DataTable
            rows={s.issuances.filter((i) => i.employeeId === employee.id)}
            caption="Lịch sử cấp phát cá nhân"
            columns={[
              {
                key: "date",
                label: "Ngày cấp",
                render: (i) => dateLabel(i.date),
              },
              {
                key: "code",
                label: "Mã / cỡ",
                render: (i) => s.skus.find((x) => x.id === i.skuId)?.code,
              },
              { key: "qty", label: "Số bộ", render: (i) => i.quantity },
              {
                key: "price",
                label: "Giá mua lịch sử",
                render: (i) => money(i.price),
              },
              { key: "returned", label: "Đã trả", render: (i) => i.returned },
              {
                key: "return",
                label: "Nhận trả",
                render: (i) =>
                  actor.role === "warehouse" && i.returned < i.quantity ? (
                    <ConfirmAction
                      label="Nhận trả 1 bộ"
                      reason
                      description="Chỉ nhận lại bộ còn sử dụng. Trả hàng không hoàn lại hạn mức đã cấp."
                      onConfirm={(reason) =>
                        act({
                          type: "uniform.return",
                          id: i.id,
                          quantity: 1,
                          reason,
                        })
                      }
                    />
                  ) : null,
              },
            ]}
          />
        </Modal>
      )}
    </>
  );
}

function Reports() {
  const { state: s, actor } = useDemo();
  const [dep, setDep] = useState(""),
    [sku, setSku] = useState(""),
    [size, setSize] = useState(""),
    [gender, setGender] = useState(""),
    [from, setFrom] = useState(s.settings.date.slice(0, 4) + "-01-01"),
    [to, setTo] = useState(s.settings.date);
  const rows = s.issuances.filter(
    (i) =>
      canDepartment(actor, i.departmentId) &&
      (actor.role !== "employee" || i.employeeId === actor.employeeId) &&
      (!dep || i.departmentId === dep) &&
      (!sku || i.skuId === sku) &&
      (!size ||
        normalizeSize(s.skus.find((x) => x.id === i.skuId)?.size || "") ===
          normalizeSize(size)) &&
      (!gender || s.skus.find((x) => x.id === i.skuId)?.gender === gender) &&
      i.date >= from &&
      i.date <= to,
  );
  return (
    <>
      <div className="filter-row">
        <Field label="Khoa báo cáo">
          <select value={dep} onChange={(e) => setDep(e.target.value)}>
            <option value="">Tất cả được phép</option>
            {s.departments
              .filter((d) => canDepartment(actor, d.id))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Mã hàng">
          <select value={sku} onChange={(e) => setSku(e.target.value)}>
            <option value="">Tất cả mã</option>
            {s.skus.map((x) => (
              <option key={x.id} value={x.id}>
                {x.code}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Cỡ">
          <select value={size} onChange={(e) => setSize(e.target.value)}>
            <option value="">Tất cả cỡ</option>
            {[...new Set(s.skus.map((x) => x.size))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Từ ngày">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Giới tính biến thể báo cáo">
          <select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Tất cả</option>
            {(["unisex", "male", "female"] as const).map((g) => (
              <option key={g} value={g}>
                {genderLabels[g]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Đến ngày">
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </Field>
      </div>
      <div className="summary-strip">
        <span>
          <strong>{rows.reduce((n, x) => n + x.quantity, 0)}</strong> bộ đã bàn
          giao
        </span>
        <span>
          <strong>
            {money(rows.reduce((n, x) => n + x.quantity * x.price, 0))}
          </strong>{" "}
          theo giá mua lịch sử
        </span>
      </div>
      <Panel
        title="Báo cáo cấp phát"
        description="Chỉ tính số đã bàn giao; không gộp nháp và giữ hàng"
        action={
          <ExportButton
            onClick={() =>
              exportCsv(
                "bao-cao-cap-phat-demo.csv",
                [
                  "Ngày",
                  "Nhân viên",
                  "Khoa",
                  "Mã",
                  "Cỡ",
                  "Giới tính biến thể",
                  "Số bộ",
                  "Giá lịch sử",
                ],
                rows.map((i) => [
                  i.date,
                  i.employeeId,
                  i.departmentId,
                  s.skus.find((x) => x.id === i.skuId)!.code,
                  s.skus.find((x) => x.id === i.skuId)!.size,
                  genderLabels[s.skus.find((x) => x.id === i.skuId)!.gender],
                  i.quantity,
                  i.price,
                ]),
              )
            }
          />
        }
      >
        <DataTable
          rows={rows}
          caption="Báo cáo cấp phát"
          columns={[
            {
              key: "date",
              label: "Ngày cấp",
              sort: (i) => i.date,
              render: (i) => dateLabel(i.date),
            },
            {
              key: "employee",
              label: "Nhân viên",
              render: (i) =>
                s.employees.find((e) => e.id === i.employeeId)?.name,
            },
            {
              key: "dept",
              label: "Khoa",
              render: (i) =>
                s.departments.find((d) => d.id === i.departmentId)?.name,
            },
            {
              key: "sku",
              label: "Mã / cỡ",
              sort: (i) => i.skuId,
              render: (i) => s.skus.find((x) => x.id === i.skuId)?.code,
            },
            {
              key: "quantity",
              label: "Số bộ",
              sort: (i) => i.quantity,
              render: (i) => i.quantity,
            },
            {
              key: "price",
              label: "Đơn giá lịch sử",
              render: (i) => money(i.price),
            },
            {
              key: "total",
              label: "Thành tiền",
              render: (i) => money(i.price * i.quantity),
            },
          ]}
        />
      </Panel>
    </>
  );
}

export function UniformPage() {
  const { state: s, actor, act } = useDemo();
  const loc = useLocation(),
    navigate = useNavigate(),
    params = useParams();
  const tab = loc.pathname.includes("/du-lieu-excel")
    ? "du-lieu-excel"
    : loc.pathname.includes("/kho")
      ? "kho"
      : loc.pathname.includes("/nhan-vien")
        ? "nhan-vien"
        : loc.pathname.includes("/bao-cao")
          ? "bao-cao"
          : "yeu-cau";
  const [form, setForm] = useState<UniformRequest | "new" | null>(null),
    [filter, setFilter] = useState("");
  const req = params.id
    ? requestsFor(s, actor).find((r) => r.id === params.id)
    : undefined;
  const rows = requestsFor(s, actor).filter(
    (r) => !filter || r.status === filter,
  );
  return (
    <>
      <PageHeader
        eyebrow="NGHIỆP VỤ / ĐỒNG PHỤC"
        title="Quản lý đồng phục"
        description="Từ nhu cầu của từng khoa đến cấp phát và đối soát tồn kho."
        action={
          ["coordinator", "admin"].includes(actor.role) ? (
            <Button onClick={() => setForm("new")}>
              <Plus size={17} />
              Lập yêu cầu
            </Button>
          ) : undefined
        }
      />
      <Tabs
        value={tab}
        onChange={(v) => navigate("/dong-phuc/" + v)}
        tabs={[
          {
            id: "yeu-cau",
            label: "Yêu cầu cấp phát",
            count: requestsFor(s, actor).length,
          },
          { id: "kho", label: "Danh mục & tồn kho" },
          { id: "nhan-vien", label: "Nhân viên" },
          { id: "bao-cao", label: "Báo cáo" },
          ...(s.workbookData
            ? [
                {
                  id: "du-lieu-excel",
                  label: "Dữ liệu Excel",
                  count: s.workbookData.uniformRequests.length,
                },
              ]
            : []),
        ]}
      />
      {tab === "du-lieu-excel" ? (
        <WorkbookDataPanel kind="uniforms" />
      ) : tab === "kho" ? (
        <Inventory />
      ) : tab === "nhan-vien" ? (
        <Employees />
      ) : tab === "bao-cao" ? (
        <Reports />
      ) : (
        <>
          <div className="filter-row">
            <Field label="Trạng thái yêu cầu">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                {[
                  "draft",
                  "waiting_stock",
                  "pending",
                  "reserved",
                  "issued",
                  "rejected",
                  "cancelled",
                ].map((k) => (
                  <option key={k} value={k}>
                    {
                      {
                        draft: "Bản nháp",
                        waiting_stock: "Chờ bổ sung",
                        pending: "Chờ duyệt",
                        reserved: "Đã giữ hàng",
                        issued: "Đã cấp phát",
                        rejected: "Từ chối",
                        cancelled: "Đã hủy",
                      }[k as "draft"]
                    }
                  </option>
                ))}
              </select>
            </Field>
            <p className="helper">
              <Shirt size={17} /> Định mức mặc định hiện tại:{" "}
              <strong>{s.settings.annualLimit} bộ/người/năm</strong>
            </p>
          </div>
          <Panel
            title="Yêu cầu từ khoa / phòng"
            description="Theo dõi số lượng, trách nhiệm xử lý và lịch sử phê duyệt"
          >
            <DataTable
              rows={rows}
              caption="Yêu cầu cấp phát"
              searchText={(r) => r.id + " " + r.note + " " + r.departmentId}
              columns={[
                {
                  key: "id",
                  label: "Mã yêu cầu",
                  sort: (r) => r.id,
                  render: (r) => (
                    <>
                      <strong>{r.id}</strong>
                      <small>{dateLabel(r.date)}</small>
                    </>
                  ),
                },
                {
                  key: "dep",
                  label: "Khoa / phòng",
                  render: (r) =>
                    s.departments.find((d) => d.id === r.departmentId)?.name,
                },
                {
                  key: "qty",
                  label: "Nhu cầu",
                  sort: (r) => r.lines.reduce((n, l) => n + l.quantity, 0),
                  render: (r) => (
                    <>
                      {r.lines.reduce((n, l) => n + l.quantity, 0)} bộ
                      <small>{r.lines.length} dòng sản phẩm</small>
                    </>
                  ),
                },
                {
                  key: "status",
                  label: "Trạng thái",
                  sort: (r) => r.status,
                  render: (r) => <Badge status={r.status} />,
                },
                {
                  key: "step",
                  label: "Bước xử lý",
                  render: (r) =>
                    r.status === "pending" ? (
                      roleLabels[r.stages[r.decisions.length]]
                    ) : r.exceptionReason ? (
                      <span className="text-warning">Có ngoại lệ</span>
                    ) : (
                      "—"
                    ),
                },
                {
                  key: "action",
                  label: "Hồ sơ",
                  render: (r) => (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/dong-phuc/yeu-cau/" + r.id)}
                    >
                      Xem hồ sơ
                    </Button>
                  ),
                },
              ]}
            />
          </Panel>
        </>
      )}
      {form && (
        <RequestForm
          request={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}
      <Modal
        open={!!params.id}
        onOpenChange={(v) => !v && navigate("/dong-phuc/yeu-cau")}
        title={req?.id || "Không thể mở yêu cầu"}
        description="Hồ sơ dùng chung giữa khoa, Hành chính, kho và mua sắm."
        wide
      >
        {req ? (
          <>
            <div className="detail-meta">
              <Badge status={req.status} />
              <span>
                {s.departments.find((d) => d.id === req.departmentId)?.name}
              </span>
              <span>{dateLabel(req.date)}</span>
            </div>
            <p>{req.note}</p>
            {req.exceptionReason && (
              <Notice>
                <strong>Ngoại lệ cần Lãnh đạo:</strong> {req.exceptionReason}
              </Notice>
            )}
            <DataTable
              rows={req.lines}
              caption="Chi tiết dòng cấp phát"
              columns={[
                {
                  key: "emp",
                  label: "Nhân viên",
                  render: (l) =>
                    s.employees.find((e) => e.id === l.employeeId)?.name,
                },
                {
                  key: "sku",
                  label: "Mã / cỡ",
                  render: (l) => s.skus.find((x) => x.id === l.skuId)?.code,
                },
                {
                  key: "qty",
                  label: "Số bộ yêu cầu",
                  render: (l) => l.quantity,
                },
                {
                  key: "issued",
                  label: "Đã cấp",
                  render: (l) =>
                    s.issuances
                      .filter(
                        (i) =>
                          i.requestId === req.id &&
                          i.employeeId === l.employeeId &&
                          i.skuId === l.skuId,
                      )
                      .reduce((n, i) => n + i.quantity, 0),
                },
                {
                  key: "issuedDate",
                  label: "Ngày cấp",
                  render: (l) => {
                    const dates = s.issuances
                      .filter(
                        (i) =>
                          i.requestId === req.id &&
                          i.employeeId === l.employeeId &&
                          i.skuId === l.skuId,
                      )
                      .map((i) => dateLabel(i.date));
                    return [...new Set(dates)].join(", ") || "Chưa bàn giao";
                  },
                },
                {
                  key: "stock",
                  label: "Khả dụng",
                  render: (l) => stock(s, l.skuId).available,
                },
              ]}
            />
            <ApprovalTimeline record={req} />
            {!!linkedPurchases(s, actor, req.id).length && (
              <Panel title="Chứng từ mua liên quan">
                <div className="panel-body stack">
                  {linkedPurchases(s, actor, req.id).map(
                    ({ purchase, orders }) => (
                      <div key={purchase.id}>
                        <Link
                          className="text-brand"
                          to={"/mua-sam/de-nghi/" + purchase.id}
                        >
                          PR {purchase.id}
                        </Link>
                        {orders.map((order) => (
                          <p key={order.id}>
                            <Link
                              className="text-brand"
                              to={"/mua-sam/don-hang/" + order.id}
                            >
                              PO {order.id}
                            </Link>
                          </p>
                        ))}
                      </div>
                    ),
                  )}
                </div>
              </Panel>
            )}
            {req.status === "waiting_stock" && (
              <Notice>
                <AlertTriangle size={16} /> Chưa giữ hàng. Có thể lập đề nghị bổ
                sung từ phân hệ Mua sắm; sau nhận hàng, gửi duyệt lại yêu cầu.
              </Notice>
            )}
            <div className="actions wrap">
              {["draft", "rejected"].includes(req.status) &&
                ["admin", "coordinator"].includes(actor.role) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForm(req);
                      navigate("/dong-phuc/yeu-cau");
                    }}
                  >
                    Sửa bản nháp
                  </Button>
                )}
              {["draft", "rejected", "waiting_stock"].includes(req.status) &&
                ["admin", "coordinator"].includes(actor.role) && (
                  <ConfirmAction
                    label="Gửi duyệt yêu cầu"
                    variant="default"
                    description="Kiểm tra định mức và tồn; yêu cầu thiếu hàng sẽ chờ bổ sung."
                    onConfirm={() =>
                      act({ type: "uniform.submit", id: req.id })
                    }
                  />
                )}{" "}
              {canApprove(actor, req, s) && (
                <>
                  <ConfirmAction
                    label="Duyệt yêu cầu"
                    variant="default"
                    description="Duyệt bước cuối sẽ giữ hàng ngay, chưa trừ tồn vật lý."
                    onConfirm={(reason) =>
                      act({
                        type: "approve",
                        entity: "uniform",
                        id: req.id,
                        approved: true,
                        reason,
                      })
                    }
                  />
                  <ConfirmAction
                    label="Từ chối"
                    reason
                    variant="destructive"
                    description="Từ chối đóng vòng duyệt và giải phóng cam kết định mức."
                    onConfirm={(reason) =>
                      act({
                        type: "approve",
                        entity: "uniform",
                        id: req.id,
                        approved: false,
                        reason,
                      })
                    }
                  />
                </>
              )}
              {req.status === "reserved" && actor.role === "warehouse" && (
                <ConfirmAction
                  label="Xác nhận bàn giao"
                  variant="default"
                  description="Ghi lịch sử giá lô và trừ tồn vật lý đúng số đã giữ."
                  onConfirm={() => act({ type: "uniform.issue", id: req.id })}
                />
              )}{" "}
              {!["issued", "cancelled"].includes(req.status) &&
                ["admin", "coordinator"].includes(actor.role) && (
                  <ConfirmAction
                    label="Hủy yêu cầu"
                    reason
                    description="Hủy sẽ giải phóng định mức và hàng đã giữ; PO đã tạo không tự bị hủy."
                    onConfirm={(reason) =>
                      act({ type: "uniform.cancel", id: req.id, reason })
                    }
                  />
                )}{" "}
              {req.status === "waiting_stock" &&
                ["admin", "coordinator", "buyer"].includes(actor.role) && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/mua-sam/nhu-cau")}
                  >
                    Chuyển nhu cầu mua
                  </Button>
                )}
            </div>
          </>
        ) : (
          <Notice danger>
            Yêu cầu không tồn tại hoặc nằm ngoài phạm vi được phép.
          </Notice>
        )}
      </Modal>
    </>
  );
}
