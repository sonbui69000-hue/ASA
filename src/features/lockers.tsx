import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Plus, DoorOpen, Users, KeyRound, Wrench, MapPin } from "lucide-react";
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
} from "../components/shared";
import {
  availableLockers,
  lockerStatus,
  canReadLocker,
  lockerEventsFor,
} from "../domain/selectors";
import { dateLabel, type Locker } from "../domain/types";
import { WorkbookDataPanel } from "./workbook-data";
function LockerForm({
  locker,
  onClose,
}: {
  locker?: Locker;
  onClose: () => void;
}) {
  const { state: s, act } = useDemo();
  const [v, setV] = useState({
    number: locker?.number || "",
    building: locker?.building || "Tòa A",
    floor: locker?.floor || "1",
    area: locker?.area || "Khu A",
    departmentId: locker?.departmentId || "NOI",
    condition: locker?.condition || ("good" as Locker["condition"]),
    active: locker?.active ?? true,
  });
  return (
    <Modal
      open
      onOpenChange={(x) => !x && onClose()}
      title={locker ? "Cập nhật tủ đồ" : "Thêm tủ đồ"}
      description="Mã tủ duy nhất theo tòa nhà, tầng, khu và số; sở hữu khác người sử dụng."
      submitLabel="Xác nhận lưu tủ"
      onSubmit={() => act({ type: "locker.save", id: locker?.id, ...v })}
    >
      <div className="form-grid">
        <Field label="Số tủ">
          <input
            required
            value={v.number}
            onChange={(e) => setV({ ...v, number: e.target.value })}
          />
        </Field>
        <Field label="Tòa nhà">
          <input
            required
            value={v.building}
            onChange={(e) => setV({ ...v, building: e.target.value })}
          />
        </Field>
        <Field label="Tầng">
          <input
            required
            value={v.floor}
            onChange={(e) => setV({ ...v, floor: e.target.value })}
          />
        </Field>
        <Field label="Khu / dãy">
          <input
            required
            value={v.area}
            onChange={(e) => setV({ ...v, area: e.target.value })}
          />
        </Field>
        <Field label="Khoa sở hữu">
          <select
            value={v.departmentId}
            onChange={(e) => setV({ ...v, departmentId: e.target.value })}
          >
            {s.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tình trạng vật lý">
          <select
            value={v.condition}
            onChange={(e) =>
              setV({ ...v, condition: e.target.value as Locker["condition"] })
            }
          >
            <option value="good">Tốt • có thể sử dụng</option>
            <option value="maintenance">Hỏng / bảo trì</option>
          </select>
        </Field>
      </div>
      <label className="check">
        <input
          type="checkbox"
          checked={v.active}
          onChange={(e) => setV({ ...v, active: e.target.checked })}
        />
        Tủ đang hoạt động
      </label>
    </Modal>
  );
}
function AllocationForm({ onClose }: { onClose: () => void }) {
  const { state: s, act } = useDemo();
  const [qty, setQty] = useState(1),
    [area, setArea] = useState(""),
    [floor, setFloor] = useState(""),
    [building, setBuilding] = useState(""),
    [type, setType] = useState("employee"),
    [employees, setEmployees] = useState<string[]>([]),
    [department, setDepartment] = useState("NOI"),
    [reserve, setReserve] = useState(false),
    [reason, setReason] = useState(""),
    [preview, setPreview] = useState<string[]>([]),
    [error, setError] = useState("");
  const available = availableLockers(s, area).filter(
    (l) =>
      (!floor || l.floor === floor) && (!building || l.building === building),
  );
  const eligible = s.employees.filter(
    (e) =>
      e.active &&
      !s.lockers.some((l) => l.employeeId === e.id || l.reservedFor === e.id),
  );
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title="Tìm và phân bổ tủ"
      description="Gợi ý có thứ tự xác định. Xem trước chưa giữ tủ; xác nhận sẽ kiểm tra lại khả năng đáp ứng."
      wide
      submitLabel={reserve ? "Xác nhận giữ chỗ" : "Xác nhận phân bổ"}
      onSubmit={async () => {
        if (!Number.isInteger(qty) || qty < 1)
          throw Error("Nhập số tủ nguyên lớn hơn 0.");
        if (preview.length !== qty)
          throw Error("Cần xem trước đủ số tủ theo yêu cầu trước xác nhận.");
        await act({
          type: "locker.allocate",
          ids: preview,
          employeeIds: type === "employee" ? employees : [],
          departmentId: type === "department" ? department : "",
          reason,
          reserve,
        });
      }}
    >
      <div className="form-grid">
        <Field label="Số lượng tủ yêu cầu">
          <input
            required
            min="1"
            type="number"
            step="1"
            value={qty}
            onChange={(e) => {
              setQty(Number(e.target.value));
              setPreview([]);
            }}
          />
        </Field>
        <Field label="Ưu tiên tòa nhà">
          <select
            value={building}
            onChange={(e) => {
              setBuilding(e.target.value);
              setPreview([]);
            }}
          >
            <option value="">Tất cả tòa nhà</option>
            {[...new Set(s.lockers.map((l) => l.building))].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </Field>
        <Field label="Ưu tiên khu">
          <select
            value={area}
            onChange={(e) => {
              setArea(e.target.value);
              setPreview([]);
            }}
          >
            <option value="">Tất cả khu</option>
            {[...new Set(s.lockers.map((l) => l.area))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Ưu tiên tầng">
          <select
            value={floor}
            onChange={(e) => {
              setFloor(e.target.value);
              setPreview([]);
            }}
          >
            <option value="">Tất cả tầng</option>
            {[...new Set(s.lockers.map((l) => l.floor))].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Hình thức giao">
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="employee">Giao cho nhân viên</option>
            <option value="department">Giao cho đơn vị</option>
          </select>
        </Field>
      </div>
      {type === "employee" ? (
        <Field
          label="Nhân viên nhận tủ"
          hint={`Chọn đúng ${qty} nhân viên; dùng Ctrl/Cmd để chọn nhiều. Đã chọn ${employees.length}.`}
        >
          <select
            multiple
            size={5}
            value={employees}
            onChange={(e) =>
              setEmployees([...e.target.selectedOptions].map((x) => x.value))
            }
          >
            {eligible.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} •{" "}
                {s.departments.find((d) => d.id === e.departmentId)?.name}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Đơn vị nhận tủ">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            {s.departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <label className="check">
        <input
          type="checkbox"
          checked={reserve}
          onChange={(e) => setReserve(e.target.checked)}
        />
        Giữ chỗ trước bàn giao
      </label>
      <Field label="Lý do phân bổ / giữ chỗ">
        <textarea
          required
          minLength={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Field>
      <div className="allocation-preview">
        <div>
          <strong>{available.length} tủ phù hợp</strong>
          <p className="helper">
            Loại trừ tủ đang sử dụng, giữ chỗ, ngừng hoạt động và bảo trì.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setError("");
            if (!Number.isInteger(qty) || qty < 1) {
              setError("Số lượng phải là số nguyên dương.");
              return;
            }
            if (available.length < qty) {
              setPreview([]);
              setError(
                `Chỉ có ${available.length} tủ phù hợp, không đủ ${qty}. Giảm số lượng hoặc đổi vị trí.`,
              );
              return;
            }
            setPreview(available.slice(0, qty).map((l) => l.id));
          }}
        >
          Gợi ý danh sách tủ
        </Button>
      </div>
      {error && <Notice danger>{error}</Notice>}
      {preview.length > 0 && (
        <div className="locker-preview-grid">
          {preview.map((id) => {
            const l = s.lockers.find((l) => l.id === id)!;
            return (
              <div key={id}>
                <DoorOpen size={20} />
                <strong>{l.number}</strong>
                <span>
                  {l.area} • Tầng {l.floor}
                </span>
                <small>{l.id}</small>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
export function LockersPage() {
  const { state: s, actor, act } = useDemo();
  const location = useLocation(),
    navigate = useNavigate(),
    sourceLocker = new URLSearchParams(location.search).get("locker");
  const [tab, setTab] = useState("inventory"),
    [area, setArea] = useState(""),
    [floor, setFloor] = useState(""),
    [building, setBuilding] = useState(""),
    [department, setDepartment] = useState(""),
    [status, setStatus] = useState(""),
    [form, setForm] = useState<Locker | "new" | null>(null),
    [allocate, setAllocate] = useState(false),
    [transfer, setTransfer] = useState<Locker | null>(null),
    [employee, setEmployee] = useState(""),
    [reason, setReason] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setTab(p.get("view") === "excel" ? "excel" : "inventory");
    setFloor(p.get("floor") || "");
    const building = p.get("building") || "";
    setBuilding(
      building && !building.startsWith("Tòa ")
        ? "Tòa " + building.toUpperCase()
        : building,
    );
    setArea(p.get("area") || "");
    setDepartment("");
    setStatus(p.get("status") === "available" ? "available" : "");
  }, [location.search]);
  const allowed = (l: Locker) => canReadLocker(s, actor, l);
  const history = lockerEventsFor(s, actor);
  const rows = s.lockers.filter(
    (l) =>
      allowed(l) &&
      (!sourceLocker || l.id === sourceLocker) &&
      (!area || l.area === area) &&
      (!floor || l.floor === floor) &&
      (!building || l.building === building) &&
      (!department || l.departmentId === department) &&
      (!status ||
        (status === "in_use"
          ? ["occupied", "held"].includes(lockerStatus(l))
          : lockerStatus(l) === status)),
  );
  const metrics = [
    {
      label: "Tổng danh mục",
      value: s.lockers.filter((l) => l.active).length,
      icon: DoorOpen,
      status: "all",
    },
    {
      label: "Trống có thể cấp",
      value: availableLockers(s).length,
      icon: KeyRound,
      status: "available",
    },
    {
      label: "Đang sử dụng / giữ chỗ",
      value: s.lockers.filter((l) =>
        ["occupied", "held"].includes(lockerStatus(l)),
      ).length,
      icon: Users,
      status: "in_use",
    },
    {
      label: "Bảo trì / ngừng dùng",
      value: s.lockers.filter((l) => lockerStatus(l) === "maintenance").length,
      icon: Wrench,
      status: "maintenance",
    },
  ];
  const name = (id: string) =>
    s.employees.find((e) => e.id === id)?.name ||
    s.departments.find((d) => d.id === id)?.name ||
    id ||
    "—";
  return (
    <>
      <PageHeader
        eyebrow="TÀI SẢN / TỦ ĐỒ"
        title="Quản lý tủ đồ"
        description="Theo dõi vị trí, khả năng đáp ứng và lịch sử bàn giao cho nhân viên hoặc đơn vị."
        action={
          actor.role === "admin" ? (
            <div className="actions">
              <Button variant="outline" onClick={() => setForm("new")}>
                <Plus size={16} />
                Thêm tủ
              </Button>
              <Button onClick={() => setAllocate(true)}>
                <KeyRound size={16} />
                Phân bổ tủ
              </Button>
            </div>
          ) : undefined
        }
      />
      {sourceLocker && (
        <Notice>
          Đang xem nguồn:{" "}
          {rows.some((l) => l.id === sourceLocker)
            ? sourceLocker
            : "Tủ không còn khả dụng trong phạm vi được phép"}
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
      <div className="metrics locker-metrics">
        {metrics.map((m) => (
          <button
            className="metric"
            key={m.label}
            onClick={() => {
              setTab("inventory");
              setStatus(m.status === "all" ? "" : m.status);
            }}
          >
            <div className="metric-top">
              <span>{m.label}</span>
              <m.icon size={19} />
            </div>
            <strong className="metric-value">{m.value}</strong>
            <div className="metric-bottom">
              {m.status === "all"
                ? "Dữ liệu tủ tổng hợp"
                : "Mở danh sách theo trạng thái"}
            </div>
          </button>
        ))}
      </div>
      <Tabs
        tabs={[
          { id: "inventory", label: "Danh mục & trạng thái" },
          ...(s.workbookData
            ? [
                {
                  id: "excel",
                  label: "Dữ liệu Excel",
                  count: s.workbookData.lockers.length,
                },
              ]
            : []),
          {
            id: "history",
            label: "Lịch sử bàn giao",
            count: history.length,
          },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "excel" ? (
        <WorkbookDataPanel kind="lockers" />
      ) : tab === "history" ? (
        <Panel title="Lịch sử cấp, chuyển và thu hồi">
          <DataTable
            rows={[...history].reverse()}
            caption="Lịch sử tủ đồ"
            searchText={(e) =>
              e.lockerId +
              " " +
              name(e.from) +
              " " +
              name(e.to) +
              " " +
              e.reason
            }
            columns={[
              {
                key: "date",
                label: "Ngày",
                sort: (e) => e.date,
                render: (e) => dateLabel(e.date),
              },
              { key: "locker", label: "Tủ", render: (e) => e.lockerId },
              { key: "action", label: "Nghiệp vụ", render: (e) => e.action },
              { key: "from", label: "Từ", render: (e) => name(e.from) },
              { key: "to", label: "Đến", render: (e) => name(e.to) },
              { key: "reason", label: "Lý do", render: (e) => e.reason },
            ]}
          />
        </Panel>
      ) : (
        <>
          <div className="filter-row">
            <Field label="Tòa nhà">
              <select
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              >
                <option value="">Tất cả tòa nhà</option>
                {[...new Set(s.lockers.map((l) => l.building))].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </Field>
            <Field label="Vị trí / khu">
              <select value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="">Tất cả khu</option>
                {[...new Set(s.lockers.map((l) => l.area))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Tầng">
              <select value={floor} onChange={(e) => setFloor(e.target.value)}>
                <option value="">Tất cả tầng</option>
                {[...new Set(s.lockers.map((l) => l.floor))].map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Khoa sở hữu">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">Tất cả đơn vị</option>
                {s.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Trạng thái tủ">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="available">Trống</option>
                <option value="occupied">Đang sử dụng</option>
                <option value="in_use">Đang sử dụng hoặc giữ chỗ</option>
                <option value="held">Đã giữ chỗ</option>
                <option value="maintenance">Bảo trì / ngừng dùng</option>
              </select>
            </Field>
          </div>
          <Panel
            title="Danh mục tủ đồ"
            description={`Công suất sử dụng: ${Math.round((s.lockers.filter((l) => l.employeeId || l.assignedDepartmentId).length / Math.max(1, s.lockers.filter((l) => l.active).length)) * 100)}% • Sở hữu tủ được giữ nguyên khi chuyển người dùng`}
          >
            <DataTable
              rows={rows}
              caption="Danh mục tủ"
              searchText={(l) =>
                l.id + " " + l.number + " " + l.area + " " + name(l.employeeId)
              }
              columns={[
                {
                  key: "id",
                  label: "Mã / số tủ",
                  sort: (l) => l.id,
                  render: (l) => (
                    <>
                      <strong>{l.id}</strong>
                      <small>Tủ số {l.number}</small>
                    </>
                  ),
                },
                {
                  key: "location",
                  label: "Vị trí",
                  sort: (l) => l.area + l.floor + l.number,
                  render: (l) => (
                    <>
                      {l.building} • Tầng {l.floor}
                      <small>{l.area}</small>
                    </>
                  ),
                },
                {
                  key: "owner",
                  label: "Đơn vị sở hữu",
                  render: (l) =>
                    s.departments.find((d) => d.id === l.departmentId)?.name,
                },
                {
                  key: "state",
                  label: "Trạng thái",
                  render: (l) => <Badge status={lockerStatus(l)} />,
                },
                {
                  key: "user",
                  label: "Người / đơn vị sử dụng",
                  render: (l) =>
                    name(
                      l.employeeId || l.assignedDepartmentId || l.reservedFor,
                    ),
                },
                {
                  key: "actions",
                  label: "Thao tác",
                  render: (l) =>
                    actor.role === "admin" ? (
                      <div className="actions wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setForm(l)}
                        >
                          Sửa tủ
                        </Button>
                        {l.employeeId ||
                        l.reservedFor ||
                        l.assignedDepartmentId ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setTransfer(l);
                                setEmployee("");
                                setReason("");
                              }}
                            >
                              Chuyển / nhận tủ
                            </Button>
                            <ConfirmAction
                              label="Trả / thu hồi"
                              reason
                              description="Kết thúc giao nhận / giữ chỗ và lưu lịch sử. Tủ bảo trì không tự thành trống sử dụng được."
                              onConfirm={(reason) =>
                                act({
                                  type: "locker.release",
                                  id: l.id,
                                  reason,
                                })
                              }
                            />
                          </>
                        ) : l.active ? (
                          <ConfirmAction
                            label="Ngừng sử dụng"
                            description="Ngừng tủ chưa cấp. Có thể mở lại bằng Sửa tủ; lịch sử được giữ."
                            onConfirm={() =>
                              act({ type: "locker.save", ...l, active: false })
                            }
                          />
                        ) : null}
                      </div>
                    ) : (
                      <span className="helper">Chỉ đọc</span>
                    ),
                },
              ]}
            />
          </Panel>
        </>
      )}
      {form && (
        <LockerForm
          locker={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
        />
      )}{" "}
      {allocate && <AllocationForm onClose={() => setAllocate(false)} />}{" "}
      {transfer && (
        <Modal
          open
          onOpenChange={(v) => !v && setTransfer(null)}
          title={"Chuyển / nhận tủ " + transfer.id}
          description="Đóng giao nhận cũ và mở người dùng mới trong cùng thao tác."
          submitLabel="Xác nhận chuyển giao"
          onSubmit={() =>
            act({
              type: "locker.transfer",
              id: transfer.id,
              employeeId: employee,
              reason,
            })
          }
        >
          <Field label="Nhân viên nhận chuyển giao">
            <select
              required
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
            >
              <option value="">Chọn người nhận</option>
              {s.employees
                .filter((e) => e.active)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Lý do chuyển giao">
            <textarea
              required
              minLength={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </Modal>
      )}
      <Notice>
        Tủ đang dùng, giữ chỗ và bảo trì được loại khỏi danh sách khả dụng. Mọi
        phân bổ cần Hành chính xác nhận, không do trợ lý quyết định.
      </Notice>
    </>
  );
}
