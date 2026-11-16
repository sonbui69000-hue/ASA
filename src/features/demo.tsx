import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Clapperboard,
  ArrowUpRight,
  RotateCcw,
  ChevronDown,
} from "lucide-react";
import {
  Badge,
  Button,
  ConfirmAction,
  Notice,
  PageHeader,
} from "../components/shared";
import { useDemo } from "../app/context";
import { demoScenarios, scenarioReadiness } from "../domain/demo-scenarios";

export function DemoGuideStrip() {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get("demo");
  const scenario = demoScenarios.find((s) => s.id === id);
  if (!scenario) return null;
  return (
    <aside
      className="demo-guide-strip"
      aria-label="Hướng dẫn kịch bản hiện tại"
    >
      <details>
        <summary>
          <Clapperboard size={18} aria-hidden="true" /> {scenario.title}{" "}
          <span>{scenario.duration}</span>
          <span>Xem các bước</span>
          <ChevronDown size={16} aria-hidden="true" />
        </summary>
        <ol>
          {scenario.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p>
          <strong>Kết quả cần thấy:</strong> {scenario.outcome}
        </p>
      </details>
      <Link className="text-brand" to="/trinh-dien">
        Về 5 kịch bản
      </Link>
    </aside>
  );
}

export function DemoPage() {
  const { state: s, actor, store, switchActor, notify } = useDemo();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader
        eyebrow="TRÌNH DIỄN CÓ HƯỚNG DẪN"
        title="5 kịch bản trong 10 phút"
        description="Một luồng dữ liệu từ nhu cầu đến phê duyệt và tra cứu. Mọi nhân viên, hợp đồng, giá và giao dịch đều hư cấu."
        action={<Badge>CHỈ MÔ PHỎNG</Badge>}
      />
      <section className="demo-preparation" aria-label="Chuẩn bị trình diễn">
        <div>
          <h2>
            <RotateCcw size={18} aria-hidden="true" /> Bắt đầu với bộ dữ liệu
            mới
          </h2>
          <p>
            Nạp một lần trước buổi trình diễn, sau đó chạy lần lượt 1–5. Nút mở
            kịch bản chỉ đổi tài khoản và trang; mọi giao dịch vẫn cần bạn kiểm
            tra, xác nhận.
          </p>
        </div>
        {actor.role === "sysadmin" ? (
          <ConfirmAction
            label="Nạp lại bộ trình diễn"
            title="Nạp bộ dữ liệu trình diễn mới?"
            description="Xóa toàn bộ thay đổi demo đang lưu, nạp lại dữ liệu tổng hợp chuẩn. Các kịch bản không lưu riêng bản dữ liệu. Chỉ xác nhận nếu bạn muốn bắt đầu lại."
            variant="default"
            onConfirm={async () => {
              await store.reset(actor.id);
              notify("Đã nạp bộ trình diễn mới. Bắt đầu từ kịch bản 1.");
            }}
          />
        ) : (
          <Button variant="outline" onClick={() => switchActor("system")}>
            Chọn Quản trị để nạp lại
          </Button>
        )}
      </section>
      <Notice>
        {s.readModel
          ? "Dữ liệu tổng hợp và SAP mô phỏng. OpenRouter chỉ đọc nguồn được phép; đổi tài khoản cần mã riêng. Phiên và phân quyền demo chưa phải bảo mật sản xuất."
          : "SAP và AI là mô phỏng cục bộ. Chọn tài khoản để diễn vai trò; phân quyền demo không cung cấp bảo mật sản xuất. Đóng hồ sơ trước khi đổi người duyệt trên thanh tài khoản."}
      </Notice>
      <div className="demo-scenario-grid">
        {demoScenarios.map((scenario, i) => {
          const readiness = scenarioReadiness(s, scenario);
          return (
            <article
              className="panel demo-scenario"
              key={scenario.id}
              aria-labelledby={`scenario-${scenario.id}`}
            >
              <div className="demo-scenario-heading">
                <span className="demo-scenario-number" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="helper">{scenario.duration}</span>
              </div>
              <h2 id={`scenario-${scenario.id}`}>{scenario.title}</h2>
              <p>{scenario.start}</p>
              <p className="helper">
                Bắt đầu bằng:{" "}
                {s.accounts.find((a) => a.id === scenario.actorId)?.name ||
                  "Tài khoản không khả dụng"}
              </p>
              <details>
                <summary>Các bước và kết quả</summary>
                <ol>
                  {scenario.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p>
                  <strong>Kết quả:</strong> {scenario.outcome}
                </p>
              </details>
              <div className="demo-scenario-footer">
                <p className={readiness.ready ? "demo-ready" : "helper"}>
                  {readiness.reason}
                </p>
                <Button
                  variant="outline"
                  disabled={!readiness.ready}
                  onClick={() => {
                    switchActor(scenario.actorId);
                    navigate(scenario.path + "?demo=" + scenario.id);
                  }}
                >
                  Mở kịch bản {i + 1}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
