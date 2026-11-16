import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Clock3,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
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
  ExportButton,
  exportCsv,
  download,
} from "../components/shared";
import {
  canApprove,
  requestsFor,
  purchasesFor,
  employeesFor,
  isWide,
  reserveCap,
} from "../domain/selectors";
import {
  roleLabels,
  jobLabels,
  genderLabels,
  dateLabel,
  type UniformRequest,
  type Purchase,
  type Settings,
  type Employee,
  type Role,
  type Audit,
  statuses,
} from "../domain/types";
export const actionLabels: Record<string, string> = {
  "uniform.create": "Lập yêu cầu đồng phục",
  "uniform.edit": "Chỉnh sửa yêu cầu",
  "uniform.submit": "Gửi yêu cầu đồng phục",
  "uniform.issue": "Bàn giao đồng phục",
  "uniform.cancel": "Hủy yêu cầu đồng phục",
  "uniform.return": "Nhận đồng phục trả lại",
  approve: "Quyết định phê duyệt",
  "sku.save": "Cập nhật danh mục",
  "stock.adjust": "Điều chỉnh kiểm kê",
  "mapping.confirm": "Xác nhận mã nhà cung cấp",
  "purchase.create": "Lập đề nghị mua",
  "purchase.edit": "Chỉnh đề nghị mua",
  "purchase.submit": "Gửi duyệt mua sắm",
  "purchase.cancel": "Hủy đề nghị mua",
  "purchase.order": "Tạo PO mô phỏng",
  receipt: "Xác nhận nhận hàng",
  "document.create": "Nhập tài liệu",
  "document.update": "Cập nhật tài liệu / quyền",
  "document.mask": "Che thông tin cá nhân",
  "document.review": "Rà soát tài liệu",
  "document.publish": "Xuất bản tài liệu",
  "document.revoke": "Thu hồi tài liệu",
  "document.version": "Tạo phiên bản mới",
  "document.sign": "Xác nhận đã đọc",
  "locker.save": "Cập nhật danh mục tủ",
  "locker.allocate": "Phân bổ / giữ chỗ tủ",
  "locker.release": "Trả / thu hồi tủ",
  "locker.transfer": "Chuyển giao tủ",
  settings: "Điều chỉnh cấu hình",
  "employee.save": "Cập nhật nhân viên",
};
export function ApprovalTimeline({
  record,
}: {
  record: UniformRequest | Purchase;
}) {
  const { state: s } = useDemo();
  return (
    <div className="approval-timeline" aria-label="Tiến trình phê duyệt">
      {record.stages.length ? (
        record.stages.map((r, i) => {
          const decision = record.decisions[i];
          return (
            <div
              key={r}
              className={
                decision?.approved
                  ? "step complete"
                  : decision
                    ? "step rejected"
                    : "step"
              }
            >
              <span className="step-icon">
                {decision?.approved ? (
                  <Check size={15} />
                ) : (
                  <Clock3 size={15} />
                )}
              </span>
              <div>
                <strong>
                  {i + 1}. {roleLabels[r]}
                </strong>
                <p>
                  {decision
                    ? `${s.accounts.find((a) => a.id === decision.actorId)?.name} • ${decision.approved ? "Đã duyệt" : "Từ chối"} • ${decision.reason}`
                    : "Chưa xử lý"}
                </p>
              </div>
            </div>
          );
        })
      ) : (
        <p className="helper">Luồng duyệt sẽ được chụp khi gửi hồ sơ.</p>
      )}
    </div>
  );
}
export function ApprovalsPage() {
  const { state: s, actor, act } = useDemo();
  const [onlyMine, setOnlyMine] = useState(true);
  const all = [
    ...requestsFor(s, actor)
      .filter((r) => r.status === "pending")
      .map((record) => ({ id: record.id, type: "uniform" as const, record })),
    ...purchasesFor(s, actor)
      .filter((p) => p.status === "pending")
      .map((record) => ({ id: record.id, type: "purchase" as const, record })),
  ];
  const rows = all.filter((x) => !onlyMine || canApprove(actor, x.record, s));
  return (
    <>
      <PageHeader
        eyebrow="KHÔNG GIAN LÀM VIỆC"
        title="Việc cần phê duyệt"
        description="Các yêu cầu từ bốn phân hệ được theo dõi tại một nơi."
      />
      <div className="filter-row">
        <label className="check">
          <input
            type="checkbox"
            checked={onlyMine}
            onChange={(e) => setOnlyMine(e.target.checked)}
          />
          Chỉ hiển thị đến lượt tôi xử lý
        </label>
        <span className="helper">
          {rows.length} hồ sơ chờ • {actor.name}
        </span>
      </div>
      <Panel
        title="Hộp việc của bạn"
        description="Kiểm tra nội dung trước khi quyết định; người gửi không được tự duyệt"
      >
        <DataTable
          rows={rows}
          caption="Hồ sơ chờ duyệt"
          columns={[
            {
              key: "id",
              label: "Hồ sơ",
              render: (x) => (
                <>
                  <strong>{x.id}</strong>
                  <small>
                    {x.type === "uniform" ? "Đồng phục" : "Mua sắm"}
                  </small>
                </>
              ),
            },
            {
              key: "sender",
              label: "Người gửi",
              render: (x) =>
                s.accounts.find((a) => a.id === x.record.requesterId)?.name,
            },
            {
              key: "step",
              label: "Bước hiện tại",
              render: (x) => (
                <Badge status="pending">
                  {roleLabels[x.record.stages[x.record.decisions.length]]}
                </Badge>
              ),
            },
            {
              key: "detail",
              label: "Chi tiết",
              render: (x) => (
                <Button variant="ghost" asChild>
                  <Link
                    to={
                      x.type === "uniform"
                        ? "/dong-phuc/yeu-cau/" + x.id
                        : "/mua-sam/de-nghi/" + x.id
                    }
                  >
                    Mở hồ sơ
                  </Link>
                </Button>
              ),
            },
            {
              key: "actions",
              label: "Quyết định",
              render: (x) =>
                canApprove(actor, x.record, s) ? (
                  <div className="actions">
                    <ConfirmAction
                      label="Phê duyệt"
                      description={`Xác nhận bước ${roleLabels[actor.role]} của ${x.id}.`}
                      variant="default"
                      onConfirm={(reason) =>
                        act({
                          type: "approve",
                          entity: x.type,
                          id: x.id,
                          approved: true,
                          reason,
                        })
                      }
                    />
                    <ConfirmAction
                      label="Từ chối"
                      reason
                      description="Lý do từ chối được gửi về hồ sơ để điều chỉnh."
                      variant="destructive"
                      onConfirm={(reason) =>
                        act({
                          type: "approve",
                          entity: x.type,
                          id: x.id,
                          approved: false,
                          reason,
                        })
                      }
                    />
                  </div>
                ) : (
                  <span className="helper">Chưa đến lượt vai trò này</span>
                ),
            },
          ]}
        />
      </Panel>
      <Notice>
        Phân bổ tủ được Hành chính xác nhận trực tiếp tại màn hình Phân bổ;
        quyết định được ghi trong lịch sử tủ và nhật ký dùng chung.
      </Notice>
    </>
  );
}
export function AuditPage() {
  const { state: s, actor } = useDemo();
  const [module, setModule] = useState(""),
    [date, setDate] = useState(""),
    [selected, setSelected] = useState<Audit | null>(null);
  const rows = s.audits.filter(
    (x) =>
      (isWide(actor) || x.actorId === actor.id) &&
      (!module || x.module === module) &&
      (!date || x.date === date),
  );
  return (
    <>
      <PageHeader
        eyebrow="GIÁM SÁT HOẠT ĐỘNG"
        title="Nhật ký thao tác"
        description={
          s.readModel
            ? "Lịch sử nghiệp vụ tổng hợp đã commit trên máy chủ; không phải audit chống sửa đổi sản xuất."
            : "Lịch sử có liên kết hồ sơ; đây là nhật ký mô phỏng trên trình duyệt."
        }
        action={
          <ExportButton
            onClick={() =>
              exportCsv(
                "nhat-ky-demo.csv",
                [
                  "Ngày",
                  "Người thực hiện",
                  "Phân hệ",
                  "Hồ sơ",
                  "Thao tác",
                  "Chi tiết",
                ],
                rows.map((x) => [
                  x.date,
                  x.actorId,
                  x.module,
                  x.entityId,
                  actionLabels[x.action] || x.action,
                  x.detail,
                ]),
              )
            }
          />
        }
      />
      <div className="filter-row">
        <Field label="Phân hệ">
          <select value={module} onChange={(e) => setModule(e.target.value)}>
            <option value="">Tất cả phân hệ</option>
            {[...new Set(s.audits.map((x) => x.module))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Ngày thao tác">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <Panel>
        <DataTable
          rows={rows}
          caption="Nhật ký"
          searchText={(x) =>
            x.entityId +
            " " +
            x.detail +
            " " +
            (actionLabels[x.action] || x.action)
          }
          columns={[
            {
              key: "date",
              label: "Ngày / mã",
              sort: (x) => x.date,
              render: (x) => (
                <>
                  {dateLabel(x.date)}
                  <small>{x.id}</small>
                </>
              ),
            },
            {
              key: "actor",
              label: "Người thực hiện",
              render: (x) =>
                s.accounts.find((a) => a.id === x.actorId)?.name || x.actorId,
            },
            {
              key: "module",
              label: "Phân hệ",
              render: (x) => <Badge>{x.module}</Badge>,
            },
            {
              key: "action",
              label: "Thao tác / hồ sơ",
              render: (x) => (
                <>
                  {actionLabels[x.action] || x.action}
                  <small>{x.entityId}</small>
                </>
              ),
            },
            {
              key: "detail",
              label: "Chi tiết",
              render: (x) => (
                <>
                  {x.detail}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelected(x)}
                  >
                    Xem thay đổi
                  </Button>
                </>
              ),
            },
          ]}
        />
      </Panel>
      {selected && (
        <Modal
          open
          onOpenChange={(v) => !v && setSelected(null)}
          title="Chi tiết thay đổi"
          description={selected.id + " • " + selected.entityId}
        >
          <p>{selected.detail}</p>
          <DataTable
            rows={[
              ...new Set([
                ...Object.keys(selected.before || {}),
                ...Object.keys(selected.after || {}),
              ]),
            ].map((key) => ({
              id: key,
              before: selected.before?.[key],
              after: selected.after?.[key],
            }))}
            caption="Thay đổi trước và sau"
            columns={[
              {
                key: "field",
                label: "Trường dữ liệu",
                render: (r) =>
                  (
                    ({
                      status: "Trạng thái",
                      quantity: "Số lượng",
                      decisions: "Số bước đã duyệt",
                      held: "Số đang giữ",
                      exception: "Ngoại lệ",
                      supplier: "Nhà cung cấp",
                      version: "Phiên bản",
                      readRoles: "Vai trò được đọc",
                      signatures: "Số xác nhận",
                      condition: "Tình trạng",
                      active: "Đang hoạt động",
                      employee: "Nhân viên",
                      department: "Đơn vị sử dụng",
                      reserved: "Giữ chỗ",
                      price: "Đơn giá",
                      available: "Khả dụng",
                      physical: "Vật lý",
                      revision: "Lần cập nhật",
                      annualLimit: "Định mức năm",
                      reserveRatio: "Tỷ lệ dự trữ",
                      date: "Ngày",
                      sapFailure: "Kịch bản SAP lỗi",
                      received: "Số đã nhận",
                      sku: "Mã hàng",
                    }) as Record<string, string>
                  )[r.id] || r.id,
              },
              {
                key: "before",
                label: "Trước",
                render: (r) =>
                  r.before === undefined
                    ? "—"
                    : typeof r.before === "boolean"
                      ? r.before
                        ? "Có"
                        : "Không"
                      : statuses[String(r.before)] || String(r.before),
              },
              {
                key: "after",
                label: "Sau",
                render: (r) =>
                  r.after === undefined
                    ? "—"
                    : typeof r.after === "boolean"
                      ? r.after
                        ? "Có"
                        : "Không"
                      : statuses[String(r.after)] || String(r.after),
              },
            ]}
          />
        </Modal>
      )}
    </>
  );
}
export function SettingsPage() {
  const { state: s, actor, act, store, notify } = useDemo();
  const [settings, setSettings] = useState<Settings>(s.settings),
    [confirm, setConfirm] = useState(false),
    [employee, setEmployee] = useState<Employee | null>(null);
  return (
    <>
      <PageHeader
        eyebrow="QUẢN TRỊ BẢN MẪU"
        title="Thiết lập demo"
        description="Các quy tắc có thể cấu hình, dữ liệu dùng chung và kịch bản tích hợp cục bộ."
      />
      <div className="two-columns">
        <Panel
          title="Quy tắc nghiệp vụ"
          description="Cấu hình mới áp dụng khi gửi hồ sơ mới; snapshot cũ được giữ"
        >
          <div className="panel-body">
            <Field label="Số bộ mỗi nhân viên / năm">
              <input
                disabled={actor.role !== "sysadmin"}
                type="number"
                min="1"
                value={settings.annualLimit}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    annualLimit: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Tỷ lệ mua dự trữ (%)">
              <input
                disabled={actor.role !== "sysadmin"}
                type="number"
                min="0"
                max="100"
                value={settings.reserveRatio * 100}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reserveRatio: Number(e.target.value) / 100,
                  })
                }
              />
            </Field>
            <Field label="Số bộ dự trữ / người">
              <input
                disabled={actor.role !== "sysadmin"}
                type="number"
                min="1"
                value={settings.reserveSets}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    reserveSets: Number(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Ngày nghiệp vụ demo">
              <input
                disabled={actor.role !== "sysadmin"}
                type="date"
                value={settings.date}
                onChange={(e) =>
                  setSettings({ ...settings, date: e.target.value })
                }
              />
            </Field>
            <Field label="Luồng duyệt đồng phục">
              <select
                disabled={actor.role !== "sysadmin"}
                value={settings.uniformStages.join(",")}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    uniformStages: e.target.value.split(",") as Role[],
                  })
                }
              >
                <option value="head,admin">Trưởng khoa → Hành chính</option>
                <option value="head,admin,leader">
                  Trưởng khoa → Hành chính → Lãnh đạo
                </option>
              </select>
            </Field>
            <Field label="Luồng duyệt mua sắm">
              <select
                disabled={actor.role !== "sysadmin"}
                value={settings.purchaseStages.join(",")}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    purchaseStages: e.target.value.split(",") as Role[],
                  })
                }
              >
                <option value="admin,finance,leader">
                  Hành chính → Tài chính → Lãnh đạo
                </option>
                <option value="finance,leader">Tài chính → Lãnh đạo</option>
              </select>
            </Field>
            <label className="check">
              <input
                disabled={actor.role !== "sysadmin"}
                type="checkbox"
                checked={settings.sapFailure}
                onChange={(e) =>
                  setSettings({ ...settings, sapFailure: e.target.checked })
                }
              />
              Mô phỏng lỗi tạo PO SAP
            </label>
            {actor.role === "sysadmin" ? (
              <ConfirmAction
                label="Lưu cấu hình"
                variant="default"
                description="Thay đổi quy tắc và ghi nhật ký. Các hồ sơ đã gửi giữ snapshot."
                onConfirm={() => act({ type: "settings", settings })}
              />
            ) : (
              <Notice>Chọn tài khoản Quản trị bản mẫu để điều chỉnh.</Notice>
            )}
          </div>
        </Panel>
        <div className="stack">
          <Panel
            title="Phạm vi mô phỏng"
            description="Cách đọc các quy tắc trong bản mẫu"
          >
            <div className="panel-body prose">
              <p>
                <strong>
                  {s.employees.filter((e) => e.active).length} nhân viên hoạt
                  động
                </strong>{" "}
                trong bộ dữ liệu tổng hợp. Trần dự trữ hiện tại là{" "}
                <strong>{reserveCap(s)} bộ</strong>, làm tròn xuống.
              </p>
              <p>
                Năm định mức: năm dương lịch tại Việt Nam. Một mã hàng = một bộ
                hoàn chỉnh. Định mức tính cả số đang cam kết; ngoại lệ cần duyệt
                bổ sung.
              </p>
              <p>
                Duyệt cuối giữ hàng, bàn giao mới trừ tồn vật lý. Giá lịch sử
                lấy theo giá mua lô; cấu hình giá hiện tại không sửa lịch sử.
              </p>
              <p>
                {s.readModel
                  ? "Phiên, quyền và giao dịch được kiểm trên máy chủ demo. File JSON và các vai trò mẫu chưa cung cấp bảo mật hoặc audit chống sửa đổi sản xuất."
                  : "RBAC, phê duyệt và nhật ký là mô phỏng. localStorage không cung cấp bảo mật sản xuất hoặc chống sửa dữ liệu."}
              </p>
              <div className="simulation-indicator">
                <ShieldCheck size={18} />
                {s.readModel
                  ? "SAP mô phỏng • OpenRouter phía máy chủ • Công cụ chỉ đọc"
                  : "SAP và AI chạy cục bộ • Không có kết nối thật"}
              </div>
            </div>
          </Panel>
          <Panel
            title="Khôi phục dữ liệu mẫu"
            description="Xóa các thay đổi và nạp lại bộ dữ liệu tổng hợp ban đầu"
          >
            <div className="panel-body">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    download(
                      s.readModel
                        ? "authorized-read-view.json"
                        : "synthetic-state.json",
                      await store.exportRaw(),
                      "application/json",
                    );
                  } catch (error) {
                    notify(
                      error instanceof Error
                        ? error.message
                        : "Không xuất được dữ liệu.",
                      true,
                    );
                  }
                }}
              >
                {s.readModel
                  ? "Xuất bản đọc được phép (không dùng nhập)"
                  : "Xuất JSON dữ liệu tổng hợp"}
              </Button>
              <ConfirmAction
                label="Khôi phục dữ liệu demo"
                variant="destructive"
                description="Tất cả thay đổi nghiệp vụ demo sẽ bị xóa. File đề xuất và tài liệu dự án không bị thay đổi."
                onConfirm={async () => {
                  await store.reset(actor.id);
                  setSettings(store.getSnapshot().settings);
                  notify("Đã khôi phục bộ dữ liệu demo.");
                }}
              />
            </div>
          </Panel>
        </div>
      </div>
      <Panel
        title="Danh mục nhân viên dùng chung"
        description="Quân số và khoa được dùng xuyên các phân hệ; chỉ Quản trị bản mẫu được chỉnh sửa"
      >
        <DataTable
          rows={employeesFor(s, actor)}
          caption="Thiết lập nhân viên"
          searchText={(e) => e.name + " " + e.id}
          columns={[
            {
              key: "name",
              label: "Nhân viên",
              sort: (e) => e.name,
              render: (e) => (
                <>
                  {e.name}
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
            { key: "job", label: "Chức danh", render: (e) => jobLabels[e.job] },
            {
              key: "active",
              label: "Trạng thái",
              render: (e) => (e.active ? "Đang hoạt động" : "Ngừng hoạt động"),
            },
            {
              key: "action",
              label: "Cập nhật",
              render: (e) =>
                actor.role === "sysadmin" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmployee({ ...e })}
                  >
                    Sửa nhân viên
                  </Button>
                ) : null,
            },
          ]}
        />
      </Panel>
      {employee && (
        <Modal
          open
          onOpenChange={(v) => !v && setEmployee(null)}
          title={employee.name}
          submitLabel="Xác nhận cập nhật"
          onSubmit={() => act({ type: "employee.save", ...employee })}
        >
          <Field label="Khoa nhân viên">
            <select
              value={employee.departmentId}
              onChange={(e) =>
                setEmployee({ ...employee, departmentId: e.target.value })
              }
            >
              {s.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Chức danh nhân viên">
            <select
              value={employee.job}
              onChange={(e) =>
                setEmployee({
                  ...employee,
                  job: e.target.value as Employee["job"],
                })
              }
            >
              {Object.entries(jobLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Giới tính nhân viên demo">
            <select
              value={employee.gender}
              onChange={(e) =>
                setEmployee({
                  ...employee,
                  gender: e.target.value as Employee["gender"],
                })
              }
            >
              {(["unspecified", "female", "male"] as const).map((g) => (
                <option key={g} value={g}>
                  {genderLabels[g]}
                </option>
              ))}
            </select>
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={employee.active}
              onChange={(e) =>
                setEmployee({ ...employee, active: e.target.checked })
              }
            />
            Đang hoạt động
          </label>
          <Notice>
            Hồ sơ lịch sử giữ nguyên khoa/chức danh lúc cấp; hồ sơ đang xử lý
            được kiểm tra lại.
          </Notice>
        </Modal>
      )}
    </>
  );
}
