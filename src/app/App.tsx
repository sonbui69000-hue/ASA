import { RemoteStore } from "../online/client";
import { useState, useEffect, lazy, Suspense } from "react";
import {
  NavLink,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Shirt,
  FileText,
  DoorOpen,
  ShoppingCart,
  ClipboardCheck,
  History,
  Settings,
  Bell,
  Search,
  Menu,
  HeartPulse,
  ChevronRight,
  ShieldCheck,
  LogIn,
  X,
  ArrowUpRight,
  Clapperboard,
} from "lucide-react";
import { useDemo } from "./context";
import {
  Button,
  Badge,
  Modal,
  Empty,
  Notice,
  ConfirmAction,
  download,
} from "../components/shared";
import { roleLabels, normalize } from "../domain/types";
import {
  requestsFor,
  purchasesFor,
  searchDocuments,
  canApprove,
  employeesFor,
  auditsFor,
  canReadLocker,
} from "../domain/selectors";
const Dashboard = lazy(() =>
  import("../features/dashboard").then((m) => ({ default: m.Dashboard })),
);
const UniformPage = lazy(() =>
  import("../features/uniforms").then((m) => ({ default: m.UniformPage })),
);
const DocumentsPage = lazy(() =>
  import("../features/documents").then((m) => ({ default: m.DocumentsPage })),
);
const PurchasesPage = lazy(() =>
  import("../features/purchases").then((m) => ({ default: m.PurchasesPage })),
);
const LockersPage = lazy(() =>
  import("../features/lockers").then((m) => ({ default: m.LockersPage })),
);
import { Assistant } from "../features/assistant";
import { DemoPage, DemoGuideStrip } from "../features/demo";
import {
  ApprovalsPage,
  AuditPage,
  SettingsPage,
  actionLabels,
} from "../features/work";
const nav = [
  { to: "/tong-quan", label: "Tổng quan", icon: LayoutDashboard },
  { to: "/dong-phuc", label: "Đồng phục", icon: Shirt },
  { to: "/tai-lieu", label: "Tra cứu tài liệu", icon: FileText },
  { to: "/tu-do", label: "Tủ đồ", icon: DoorOpen },
  { to: "/mua-sam", label: "Mua sắm", icon: ShoppingCart },
];
export function App() {
  const { state: s, actor, store, act, switchActor } = useDemo();
  const online = store instanceof RemoteStore;
  const [menu, setMenu] = useState(false),
    [search, setSearch] = useState(false),
    [q, setQ] = useState(""),
    [notifications, setNotifications] = useState(false);
  const loc = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    setMenu(false);
    document.querySelector<HTMLElement>("h1")?.focus();
  }, [loc.pathname]);
  const tasks = [...requestsFor(s, actor), ...purchasesFor(s, actor)].filter(
    (r) => canApprove(actor, r, s),
  );
  const audits = auditsFor(s, actor).slice(0, 12);
  const unread = audits.filter(
    (x) => !(s.readNotifications[actor.id] || []).includes(x.id),
  );
  const searchResults = [
    ...requestsFor(s, actor).map((r) => ({
      id: r.id,
      title: r.id + " • Yêu cầu đồng phục",
      subtitle: r.note,
      path: "/dong-phuc/yeu-cau/" + r.id,
    })),
    ...purchasesFor(s, actor).map((p) => ({
      id: p.id,
      title: p.id + " • Đề nghị mua",
      subtitle: p.note,
      path: "/mua-sam/de-nghi/" + p.id,
    })),
    ...employeesFor(s, actor).map((e) => ({
      id: e.id,
      title: e.name,
      subtitle: e.id + " • " + e.departmentId,
      path: "/dong-phuc/nhan-vien",
    })),
    ...s.skus.map((x) => ({
      id: x.id,
      title: x.code + " • " + x.name,
      subtitle: "Cỡ " + x.size + " • Danh mục đồng phục",
      path: "/dong-phuc/kho",
    })),
    ...s.lockers
      .filter((l) => canReadLocker(s, actor, l))
      .map((l) => ({
        id: l.id,
        title: l.id + " • Tủ " + l.number,
        subtitle: l.building + " • " + l.area + " • Tầng " + l.floor,
        path: "/tu-do",
      })),
    ...searchDocuments(s, actor, "").map((r) => ({
      id: r.document.id,
      title: r.document.title,
      subtitle: r.document.category,
      path: "/tai-lieu/" + r.document.id,
    })),
  ]
    .filter((x) => normalize(x.title + " " + x.subtitle).includes(normalize(q)))
    .slice(0, 10);
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      {menu && (
        <button
          className="sidebar-scrim"
          onClick={() => setMenu(false)}
          aria-label="Đóng điều hướng"
        />
      )}
      <aside
        className={`sidebar ${menu ? "sidebar-open" : ""}`}
        aria-label="Điều hướng chính"
      >
        <Link className="brand" to="/tong-quan">
          <span className="brand-icon">
            <HeartPulse size={25} />
          </span>
          <div>
            <strong>VINMEC</strong>
            <small>Hành chính tổng hợp</small>
          </div>
        </Link>
        <div className="workspace-label">
          <span className="online-dot" />
          Bệnh viện Minh An <Badge>DEMO</Badge>
        </div>
        <div className="nav-section-label">KHÔNG GIAN NGHIỆP VỤ</div>
        <nav>
          {nav.map((n) => (
            <NavLink
              to={
                s.workbookData && ["/dong-phuc", "/mua-sam"].includes(n.to)
                  ? n.to + "/du-lieu-excel"
                  : s.workbookData && n.to === "/tu-do"
                    ? "/tu-do?view=excel"
                    : n.to
              }
              key={n.to}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              <ChevronRight className="nav-chevron" size={15} />
            </NavLink>
          ))}
        </nav>
        <div className="nav-section-label">QUẢN LÝ & GIÁM SÁT</div>
        <nav>
          {[
            {
              to: "/phe-duyet",
              label: "Việc cần phê duyệt",
              icon: ClipboardCheck,
            },
            { to: "/nhat-ky", label: "Nhật ký thao tác", icon: History },
            { to: "/thiet-lap", label: "Thiết lập demo", icon: Settings },
            {
              to: "/trinh-dien",
              label: "Kịch bản trình diễn",
              icon: Clapperboard,
            },
          ].map((n) => (
            <NavLink to={n.to} key={n.to}>
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.to === "/phe-duyet" && tasks.length > 0 && (
                <span className="nav-count">{tasks.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <ShieldCheck size={21} />
          <strong>Không gian mô phỏng</strong>
          <p>
            {s.workbookData || s.readModel?.externalAiBlocked
              ? "Dữ liệu nguồn cục bộ. OpenRouter bị chặn. Không kết nối SAP thật."
              : "Dữ liệu tổng hợp. Không kết nối hệ thống Vinmec thực tế."}
          </p>
          <span>Phiên bản trình diễn 1.0</span>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="topbar-left">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              aria-label="Mở điều hướng"
              onClick={() => setMenu(true)}
            >
              <Menu size={22} />
            </Button>
            <button
              className="global-search"
              onClick={() => {
                setSearch(true);
                setQ("");
              }}
            >
              <Search size={18} />
              <span>Tìm hồ sơ, tài liệu, quy trình…</span>
              <kbd>Tìm kiếm</kbd>
            </button>
          </div>
          <div className="topbar-right">
            <span className="demo-top">
              <span className="online-dot" />
              Bản mô phỏng
            </span>
            <Button
              className="notification-button"
              variant="ghost"
              size="icon"
              aria-label={`Thông báo (${unread.length} chưa đọc)`}
              onClick={() => setNotifications(true)}
            >
              <Bell size={20} />
              {unread.length > 0 && <i />}
            </Button>
            <div className="profile-avatar">
              {roleLabels[actor.role].slice(0, 1)}
            </div>
            <label className="profile-select">
              <span>Vai trò đang sử dụng</span>
              <select
                aria-label="Tài khoản demo"
                value={actor.id}
                onChange={(e) => switchActor(e.target.value)}
              >
                {s.accounts.map((a) => (
                  <option
                    key={a.id}
                    value={a.id}
                    disabled={
                      !online &&
                      !s.employees.some(
                        (e) => e.id === a.employeeId && e.active,
                      )
                    }
                  >
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>
        <main id="main" className="main" key={actor.id}>
          {(s.workbookData || s.readModel?.externalAiBlocked) && (
            <Notice>
              <strong>Workspace cục bộ · OpenRouter bị chặn.</strong>{" "}
              {s.workbookData
                ? "Dữ liệu gốc nằm trong tab Dữ liệu Excel của Đồng phục, Mua sắm và Tủ đồ. Các tab nghiệp vụ vẫn là giao dịch đã được xác nhận riêng; không suy ra trạng thái từ workbook."
                : "Không gửi câu hỏi hoặc dữ liệu tới API AI bên ngoài."}
            </Notice>
          )}
          {!store.error && store.migrationNotice && (
            <Notice>{store.migrationNotice}</Notice>
          )}
          {store.error ? (
            <div className="stack">
              <h1>Khôi phục dữ liệu demo</h1>
              <Notice danger>{store.error}</Notice>
              <div className="actions">
                <Button onClick={() => window.location.reload()}>
                  Tải lại trang
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      download(
                        "du-lieu-demo-hien-co.json",
                        await store.exportRaw(),
                        "application/json",
                      );
                    } catch (error) {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Không xuất được dữ liệu.",
                      );
                    }
                  }}
                >
                  {online
                    ? "Tải bản đọc được phép (không dùng nhập)"
                    : "Tải bản JSON hiện có"}
                </Button>
                <ConfirmAction
                  label="Khôi phục bộ demo"
                  variant="destructive"
                  description="Xóa dữ liệu lỗi và các thay đổi trước đây, nạp lại seed tổng hợp."
                  onConfirm={() => store.reset(actor.id)}
                />
              </div>
            </div>
          ) : (
            <>
              <DemoGuideStrip />
              <Suspense
                fallback={
                  <div className="loading-state" role="status">
                    Đang tải phân hệ…
                  </div>
                }
              >
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/tong-quan" replace />}
                  />
                  <Route path="/tong-quan" element={<Dashboard />} />
                  <Route path="/trinh-dien" element={<DemoPage />} />
                  <Route
                    path="/dong-phuc"
                    element={<Navigate to="/dong-phuc/yeu-cau" replace />}
                  />
                  <Route path="/dong-phuc/:tab" element={<UniformPage />} />
                  <Route
                    path="/dong-phuc/yeu-cau/:id"
                    element={<UniformPage />}
                  />
                  <Route path="/tai-lieu" element={<DocumentsPage />} />
                  <Route path="/tai-lieu/:id" element={<DocumentsPage />} />
                  <Route
                    path="/quan-tri-tai-lieu"
                    element={<DocumentsPage />}
                  />
                  <Route
                    path="/quan-tri-tai-lieu/:id"
                    element={<DocumentsPage />}
                  />
                  <Route
                    path="/mua-sam"
                    element={<Navigate to="/mua-sam/de-nghi" replace />}
                  />
                  <Route path="/mua-sam/:tab" element={<PurchasesPage />} />
                  <Route
                    path="/mua-sam/de-nghi/:id"
                    element={<PurchasesPage />}
                  />
                  <Route
                    path="/mua-sam/don-hang/:id"
                    element={<PurchasesPage />}
                  />
                  <Route path="/tu-do/*" element={<LockersPage />} />
                  <Route path="/phe-duyet" element={<ApprovalsPage />} />
                  <Route path="/nhat-ky" element={<AuditPage />} />
                  <Route path="/thiet-lap" element={<SettingsPage />} />
                  <Route
                    path="*"
                    element={<Empty title="Không tìm thấy trang" />}
                  />
                </Routes>
              </Suspense>
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>Vinmec • Bản mẫu hành chính tổng hợp</span>
          <span>
            {online
              ? "Máy chủ demo • Phiên có kiểm tra, chưa phải bảo mật sản xuất"
              : "localStorage • RBAC mô phỏng, không phải bảo mật sản xuất"}
          </span>
        </footer>
      </div>
      <Modal
        open={search}
        onOpenChange={setSearch}
        title="Tìm kiếm toàn ứng dụng"
        description="Chỉ tìm trong hồ sơ và tài liệu bạn được phép xem."
      >
        <div className="table-search">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Nội dung tìm kiếm toàn ứng dụng"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nhập mã yêu cầu hoặc tên tài liệu…"
          />
        </div>
        <div className="global-results">
          {searchResults.length ? (
            searchResults.map((x) => (
              <button
                key={x.id}
                onClick={() => {
                  setSearch(false);
                  navigate(x.path);
                }}
              >
                <div>
                  <strong>{x.title}</strong>
                  <small>{x.subtitle}</small>
                </div>
                <ArrowUpRight size={17} />
              </button>
            ))
          ) : (
            <Empty title="Không có kết quả phù hợp" />
          )}
        </div>
      </Modal>
      <Modal
        open={notifications}
        onOpenChange={setNotifications}
        title="Trung tâm thông báo"
        description={`${unread.length} thông báo chưa đọc • Nguồn: nhật ký và công việc được phép`}
      >
        <Button
          variant="outline"
          onClick={() =>
            Promise.resolve(
              act({ type: "notifications.read", ids: audits.map((x) => x.id) }),
            ).catch(() =>
              window.alert("Chưa đánh dấu được thông báo. Vui lòng thử lại."),
            )
          }
        >
          Đánh dấu tất cả đã đọc
        </Button>
        <div className="activity-list">
          {audits.map((x) => (
            <div key={x.id}>
              <span className="activity-dot" />
              <div>
                <strong>{actionLabels[x.action] || x.action}</strong>
                <p>
                  {x.entityId} • {x.detail}
                </p>
                {!(s.readNotifications[actor.id] || []).includes(x.id) && (
                  <Badge>Chưa đọc</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>
      <Assistant key={actor.id} />
    </div>
  );
}
