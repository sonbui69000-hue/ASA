import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Shirt,
  Package,
  DoorOpen,
  FileText,
  ClipboardCheck,
  ChevronRight,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useDemo } from "../app/context";
import { Badge, Button, PageHeader, Panel, Empty } from "../components/shared";
import {
  requestsFor,
  purchasesFor,
  stock,
  availableLockers,
  searchDocuments,
  canApprove,
  employeesFor,
} from "../domain/selectors";
import { money, dateLabel, roleLabels } from "../domain/types";
import { actionLabels } from "./work";
export function Dashboard() {
  const { state: s, actor } = useDemo();
  const reqs = requestsFor(s, actor),
    purchases = purchasesFor(s, actor);
  const pending = [...reqs, ...purchases].filter((r) =>
    canApprove(actor, r, s),
  );
  const totalStock = s.skus.reduce((n, x) => n + stock(s, x.id).available, 0);
  const ownEmployees = new Set(employeesFor(s, actor).map((e) => e.id));
  const issues = s.issuances.filter(
    (i) =>
      ownEmployees.has(i.employeeId) &&
      i.date.startsWith(s.settings.date.slice(0, 4)),
  );
  const charts = s.departments.map((d) => ({
    name: d.name.replace("Khoa ", "").replace("Điều dưỡng", "Điều dưỡng"),
    value: issues
      .filter((i) => i.departmentId === d.id)
      .reduce((n, i) => n + i.quantity, 0),
  }));
  const metrics = [
    {
      label: "Yêu cầu đang xử lý",
      value: reqs.filter((r) =>
        ["pending", "waiting_stock", "reserved"].includes(r.status),
      ).length,
      caption: "Yêu cầu trong phạm vi của bạn",
      icon: Shirt,
      path: "/dong-phuc/yeu-cau",
      color: "blue",
    },
    {
      label: "Đồng phục khả dụng",
      value: totalStock,
      caption: "Bộ sẵn sàng tại kho trung tâm",
      icon: Package,
      path: "/dong-phuc/kho",
      color: "teal",
    },
    {
      label: "Tài liệu có thể tra cứu",
      value: searchDocuments(s, actor, "").length,
      caption: "Đúng quyền và còn hiệu lực",
      icon: FileText,
      path: "/tai-lieu",
      color: "violet",
    },
    {
      label: "Tủ trống sẵn sàng cấp",
      value: availableLockers(s).length,
      caption: `Trên ${s.lockers.filter((l) => l.active).length} tủ đang quản lý`,
      icon: DoorOpen,
      path: "/tu-do",
      color: "amber",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow="KHÔNG GIAN HÀNH CHÍNH"
        title="Tổng quan vận hành"
        description={`Chào ${actor.name.toLowerCase()}. Theo dõi và xử lý công việc hành chính trong ngày.`}
        action={
          <div className="actions">
            <Button variant="outline" asChild>
              <Link to="/trinh-dien">
                Kịch bản 10 phút <ArrowUpRight size={16} />
              </Link>
            </Button>
            <div className="date-chip">
              <Activity size={16} />
              {dateLabel(s.settings.date)}
              <span>Ngày demo</span>
            </div>
          </div>
        }
      />
      <div className="welcome-strip">
        <div>
          <Badge>KHÔNG GIAN LÀM VIỆC CỦA BẠN</Badge>
          <h2>Mọi nghiệp vụ, một điểm kết nối.</h2>
          <p>
            Dữ liệu xuyên suốt từ nhu cầu của khoa đến phê duyệt, bàn giao và
            đối soát.
          </p>
        </div>
        <Button asChild>
          <Link to="/phe-duyet">
            {pending.length} việc đến lượt xử lý <ArrowUpRight size={17} />
          </Link>
        </Button>
      </div>
      <div className="metrics">
        {metrics.map((m) => (
          <Link className="metric" key={m.label} to={m.path}>
            <div className="metric-top">
              <span>{m.label}</span>
              <span className={`metric-icon ${m.color}`}>
                <m.icon size={19} />
              </span>
            </div>
            <strong className="metric-value">
              {m.value.toLocaleString("vi-VN")}
            </strong>
            <div className="metric-bottom">
              {m.caption}
              <ArrowUpRight size={15} />
            </div>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Cấp phát theo khoa / phòng"
          description="Số bộ đã bàn giao trong năm demo, theo phạm vi quyền"
          action={
            <Button variant="ghost" asChild>
              <Link to="/dong-phuc/bao-cao">
                Xem báo cáo
                <ChevronRight size={16} />
              </Link>
            </Button>
          }
        >
          <div
            className="chart-wrap"
            role="img"
            aria-label={
              "Số bộ đã cấp theo khoa: " +
              charts.map((x) => x.name + " " + x.value).join(", ")
            }
          >
            <ResponsiveContainer width="100%" height={245}>
              <BarChart
                data={charts}
                barSize={28}
                margin={{ top: 20, right: 20, left: -20, bottom: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e5eaf0"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip formatter={(v) => [String(v) + " bộ", "Đã cấp"]} />
                <Bar dataKey="value" fill="#0b7892" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footer">
            <span>
              <i />
              Tổng {issues.reduce((n, i) => n + i.quantity, 0)} bộ đã cấp
            </span>
            <strong>
              {money(issues.reduce((n, i) => n + i.quantity * i.price, 0))}
            </strong>
          </div>
          <details className="chart-data">
            <summary>Xem bảng số liệu</summary>
            {charts.map((c) => (
              <p key={c.name}>
                {c.name}: {c.value} bộ
              </p>
            ))}
          </details>
        </Panel>
        <Panel
          title="Cần sự chú ý"
          description="Ưu tiên xử lý các điểm chờ trong quy trình"
        >
          <div className="attention-list">
            <Link to="/phe-duyet">
              <span className="attention-icon blue">
                <ClipboardCheck size={20} />
              </span>
              <div>
                <strong>Phê duyệt đến lượt bạn</strong>
                <p>{pending.length} hồ sơ cần xác nhận</p>
              </div>
              <b>{pending.length}</b>
            </Link>
            <Link to="/mua-sam/nhu-cau">
              <span className="attention-icon amber">
                <Package size={20} />
              </span>
              <div>
                <strong>Yêu cầu chờ bổ sung</strong>
                <p>Tổng hợp thiếu để đề nghị mua</p>
              </div>
              <b>{reqs.filter((r) => r.status === "waiting_stock").length}</b>
            </Link>
            <Link to="/dong-phuc/kho">
              <span className="attention-icon teal">
                <Shirt size={20} />
              </span>
              <div>
                <strong>Mã hàng dưới ngưỡng tồn</strong>
                <p>Kiểm tra lượng khả dụng theo cỡ</p>
              </div>
              <b>
                {
                  s.skus.filter((x) => stock(s, x.id).available < x.minStock)
                    .length
                }
              </b>
            </Link>
          </div>
          <div className="system-note">
            <span className="online-dot" />
            <div>
              <strong>Hệ thống demo sẵn sàng</strong>
              <p>Dữ liệu lưu cục bộ trên trình duyệt này</p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="dashboard-grid">
        <Panel
          title="Yêu cầu gần đây"
          description="Trạng thái được cập nhật từ dữ liệu dùng chung"
          action={
            <Button variant="ghost" asChild>
              <Link to="/dong-phuc/yeu-cau">
                Tất cả yêu cầu
                <ChevronRight size={16} />
              </Link>
            </Button>
          }
        >
          {reqs.length ? (
            <div className="recent-list">
              {[...reqs]
                .reverse()
                .slice(0, 4)
                .map((r) => (
                  <Link key={r.id} to={"/dong-phuc/yeu-cau/" + r.id}>
                    <span className="request-icon">
                      <Shirt size={20} />
                    </span>
                    <div>
                      <strong>{r.id}</strong>
                      <p>
                        {
                          s.departments.find((d) => d.id === r.departmentId)
                            ?.name
                        }{" "}
                        · {r.lines.reduce((n, l) => n + l.quantity, 0)} bộ
                      </p>
                    </div>
                    <Badge status={r.status} />
                    <ChevronRight size={16} />
                  </Link>
                ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel
          title="Hoạt động gần đây"
          description="Theo dõi trách nhiệm xử lý từng nghiệp vụ"
          action={
            <Button variant="ghost" asChild>
              <Link to="/nhat-ky">
                Nhật ký
                <ChevronRight size={16} />
              </Link>
            </Button>
          }
        >
          <div className="activity-list">
            {s.audits
              .filter((x) =>
                ["employee", "coordinator", "head"].includes(actor.role)
                  ? x.actorId === actor.id || x.actorId === "system"
                  : true,
              )
              .slice(0, 4)
              .map((x) => (
                <div key={x.id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{actionLabels[x.action] || x.action}</strong>
                    <p>
                      {s.accounts.find((a) => a.id === x.actorId)?.name} ·{" "}
                      {x.entityId}
                    </p>
                    <small>{dateLabel(x.date)}</small>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      </div>
      <div className="dashboard-note">
        <FileText size={16} />
        <span>
          Toàn bộ dữ liệu là tổng hợp. AI, SAP, phê duyệt và phân quyền đều là
          mô phỏng.
        </span>
      </div>
    </>
  );
}
