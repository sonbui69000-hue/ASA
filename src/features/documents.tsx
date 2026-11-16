import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FileText,
  Search,
  Plus,
  ShieldCheck,
  CalendarDays,
  ArrowUpRight,
  BookOpen,
  LockKeyhole,
  Quote,
  Upload,
  CheckCheck,
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
  download,
} from "../components/shared";
import { searchDocuments, canReadDocument } from "../domain/selectors";
import { documentHasPii } from "../domain/commands";
import { api, RemoteStore } from "../online/client";
import type { Evidence } from "../domain/assistant";
import type { StateRef } from "../domain/types";
import {
  roleLabels,
  dateLabel,
  type DemoDocument,
  type Role,
} from "../domain/types";
const categories = ["Quy định", "Đồng phục", "Mua sắm", "Hợp đồng", "Tủ đồ"];
function AccessEditor({
  read,
  sign,
  onRead,
  onSign,
}: {
  read: Role[];
  sign: Role[];
  onRead: (r: Role[]) => void;
  onSign: (r: Role[]) => void;
}) {
  const toggle = (items: Role[], role: Role) =>
    items.includes(role) ? items.filter((x) => x !== role) : [...items, role];
  return (
    <div className="form-grid">
      <fieldset className="access-fieldset">
        <legend>Vai trò được đọc</legend>
        {Object.entries(roleLabels).map(([r, label]) => (
          <label className="check" key={r}>
            <input
              type="checkbox"
              checked={read.includes(r as Role)}
              onChange={() => onRead(toggle(read, r as Role))}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <fieldset className="access-fieldset">
        <legend>Vai trò được ký xác nhận</legend>
        {Object.entries(roleLabels).map(([r, label]) => (
          <label className="check" key={r}>
            <input
              type="checkbox"
              checked={sign.includes(r as Role)}
              onChange={() => onSign(toggle(sign, r as Role))}
            />
            {label}
          </label>
        ))}
        <small>Người ký đồng thời phải có quyền đọc.</small>
      </fieldset>
    </div>
  );
}
function DocumentForm({
  document: d,
  onClose,
}: {
  document?: DemoDocument;
  onClose: () => void;
}) {
  const { state: s, act } = useDemo();
  const [title, setTitle] = useState(d?.title || ""),
    [category, setCategory] = useState(d?.category || "Quy định"),
    [text, setText] = useState(
      d?.sections.map((x) => x.text).join("\n\n") || "",
    ),
    [read, setRead] = useState<Role[]>(
      d?.readRoles || (Object.keys(roleLabels) as Role[]),
    ),
    [sign, setSign] = useState<Role[]>(d?.signRoles || ["employee"]),
    [expires, setExpires] = useState(d?.expires || "2027-12-31"),
    [fileError, setFileError] = useState("");
  return (
    <Modal
      open
      onOpenChange={(v) => !v && onClose()}
      title={d ? "Biên tập tài liệu và quyền" : "Nhập tài liệu mới"}
      description="Chỉ dùng nội dung tổng hợp. TXT/Markdown được đọc cục bộ; PDF/DOCX dùng bộ mẫu mô phỏng."
      wide
      submitLabel="Lưu và chờ rà soát"
      onSubmit={async () => {
        if (fileError) throw Error(fileError);
        if (d)
          await act({
            type: "document.update",
            id: d.id,
            title,
            text,
            readRoles: read,
            signRoles: sign,
            expires,
          });
        else
          await act({
            type: "document.create",
            document: {
              title,
              category,
              sections: [{ id: "muc-1", title: "1. Nội dung tài liệu", text }],
              readRoles: read,
              signRoles: sign,
              expires,
            },
          });
      }}
    >
      <div className="form-grid">
        <Field label="Tiêu đề tài liệu">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Danh mục tài liệu">
          <select
            disabled={!!d}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Ngày hết hiệu lực">
          <input
            required
            type="date"
            min={s.settings.date}
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </Field>
        {d?.status !== "published" && (
          <Field label="Tải TXT / Markdown (tối đa 200 KB)">
            <input
              type="file"
              accept=".txt,.md"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFileError("");
                if (
                  file.size > 200 * 1024 ||
                  !/^.*\.(txt|md)$/i.test(file.name)
                ) {
                  setFileError("Chỉ nhận TXT/MD tối đa 200 KB.");
                  return;
                }
                const content = await file.text();
                if (content.includes("\uFFFD")) {
                  setFileError("File cần mã hóa UTF-8 hợp lệ.");
                  return;
                }
                setText(content);
                if (!title) setTitle(file.name.replace(/\.(txt|md)$/i, ""));
              }}
            />
          </Field>
        )}
      </div>
      {fileError && <Notice danger>{fileError}</Notice>}
      {!d && (
        <Button
          variant="outline"
          onClick={() => {
            setTitle("Biên bản bàn giao • Mẫu DOCX mô phỏng");
            setText(
              "Tài liệu DOCX mẫu tổng hợp, không phải trích xuất file thật.\n\nNgười liên hệ: Nhân viên demo 999. Điện thoại: 0900000000. Email: demo@example.invalid.\n\nĐiều phối khoa kiểm tra số lượng và người nhận trước bàn giao. Hồ sơ cần Hành chính xác nhận, lưu lịch sử và chỉ lập chỉ mục sau rà soát.",
            );
          }}
        >
          Dùng mẫu DOCX mô phỏng
        </Button>
      )}
      <Field
        label="Nội dung tài liệu"
        hint={
          d?.status === "published"
            ? "Nội dung đã xuất bản chỉ đọc. Tạo phiên bản mới để sửa; có thể thay quyền đọc tại đây."
            : "Che hoặc xóa thông tin cá nhân trước bước rà soát."
        }
      >
        <textarea
          required
          rows={8}
          readOnly={d?.status === "published"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Field>
      <AccessEditor read={read} sign={sign} onRead={setRead} onSign={setSign} />
      <Notice>
        Quyền mô phỏng được kiểm tra trước tìm kiếm và truy xuất, không chỉ ẩn
        kết quả trên giao diện.
      </Notice>
    </Modal>
  );
}
export function DocumentsPage() {
  const { state: s, actor, act, store } = useDemo();
  const online = store instanceof RemoteStore;
  const nav = useNavigate(),
    loc = useLocation(),
    { id } = useParams();
  const manager = loc.pathname.startsWith("/quan-tri-tai-lieu");
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [editing, setEditing] = useState<DemoDocument | "new" | null>(null);
  const isManager = actor.role === "documents";
  const requestedVersion = Number(
    new URLSearchParams(loc.search).get("version"),
  );
  const baseDoc = id ? s.documents.find((d) => d.id === id) : undefined;
  const viewDocument =
    requestedVersion && baseDoc?.version !== requestedVersion
      ? s.documents.find((d) => d.id === id + "-v" + requestedVersion)
      : baseDoc;
  type SearchReply = {
    passages: Evidence[];
    retrievalMode: "hybrid" | "keyword";
    semanticStatus: "ready" | "semantic_unavailable";
    stateRef: StateRef;
  };
  type ReaderDocument = DemoDocument & {
    highlight?: {
      sectionId: string;
      sourceStart: number;
      sourceEnd: number;
      contentHash: string;
    };
  };
  const ref = online ? store.getSnapshot().readModel.ref : undefined;
  const scopeKey = `${ref?.workspaceId}:${ref?.revision}:${actor.id}`;
  const searchKey = `${scopeKey}:${query}:${category}`;
  const readerKey = `${scopeKey}:${id}:${loc.search}`;
  const [remoteSearch, setRemoteSearch] = useState<{
    key: string;
    value?: SearchReply;
    error?: string;
  }>();
  const [remoteDocument, setRemoteDocument] = useState<{
    key: string;
    value?: ReaderDocument;
    error?: string;
  }>();
  useEffect(() => {
    if (!online || manager || !query.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void api<SearchReply>("/api/documents/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": store.csrf,
        },
        body: JSON.stringify({
          query,
          category: category || undefined,
          expectedStateRef: ref,
          limit: 6,
        }),
        signal: controller.signal,
      })
        .then((value) => {
          if (!controller.signal.aborted)
            setRemoteSearch({ key: searchKey, value });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setRemoteSearch({
              key: searchKey,
              error:
                "Chưa tìm được tài liệu từ máy chủ. Thử lại hoặc thu hẹp câu hỏi.",
            });
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [online, manager, searchKey]);
  useEffect(() => {
    if (!online || manager || !id) return;
    const controller = new AbortController(),
      params = new URLSearchParams(loc.search);
    const requestParams = new URLSearchParams();
    for (const key of ["version", "chunk"])
      if (params.has(key)) requestParams.set(key, params.get(key)!);
    void api<ReaderDocument>(
      `/api/documents/${encodeURIComponent(id)}?${requestParams}`,
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted)
          setRemoteDocument({ key: readerKey, value });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setRemoteDocument({
            key: readerKey,
            error:
              "Nguồn đã thay đổi, hết hiệu lực hoặc không còn trong phạm vi được phép.",
          });
      });
    return () => controller.abort();
  }, [online, manager, readerKey]);
  const d =
    online && !manager
      ? remoteDocument?.key === readerKey
        ? remoteDocument.value
        : undefined
      : viewDocument;
  const allowed = d && ((manager && isManager) || canReadDocument(s, actor, d));
  const search =
    remoteSearch?.key === searchKey ? remoteSearch.value : undefined;
  const searching =
    online && !manager && !!query.trim() && remoteSearch?.key !== searchKey;
  const results =
    online && query.trim()
      ? [...new Set(search?.passages.map((e) => e.recordId) || [])].flatMap(
          (documentId) => {
            const document = s.documents.find((d) => d.id === documentId);
            if (!document) return [];
            return [
              {
                document,
                matches: search!.passages
                  .filter((e) => e.recordId === documentId)
                  .map((e) => ({
                    id: e.sectionId!,
                    title: e.sectionTitle || e.title,
                    text: e.passage,
                  })),
              },
            ];
          },
        )
      : searchDocuments(s, actor, query, category);
  const sourceFor = (documentId: string) =>
    search?.passages.find((e) => e.recordId === documentId)?.href;
  const currentVersion = Number(
    new URLSearchParams(loc.search).get("version") || d?.version,
  );
  const versionValid = !d || currentVersion === d.version;
  const base = manager ? "/quan-tri-tai-lieu" : "/tai-lieu";
  useEffect(() => {
    if (!id || !loc.hash || !allowed) return;
    const timer = setTimeout(
      () =>
        document
          .getElementById(decodeURIComponent(loc.hash.slice(1)))
          ?.scrollIntoView?.({ block: "center" }),
      0,
    );
    return () => clearTimeout(timer);
  }, [id, loc.hash, allowed]);
  return (
    <>
      <PageHeader
        eyebrow="KHO TRI THỨC / DỮ LIỆU DEMO"
        title={manager ? "Quản lý tài liệu" : "Tra cứu tài liệu"}
        description="Tìm quy định, quy trình và hợp đồng hư cấu trong phạm vi được cấp quyền."
        action={
          isManager ? (
            <Button onClick={() => setEditing("new")}>
              <Plus size={17} />
              Nhập tài liệu
            </Button>
          ) : undefined
        }
      />
      <Tabs
        value={manager ? "manage" : "search"}
        onChange={(v) =>
          nav(v === "manage" ? "/quan-tri-tai-lieu" : "/tai-lieu")
        }
        tabs={[
          { id: "search", label: "Tra cứu & đọc tài liệu" },
          ...(isManager ? [{ id: "manage", label: "Biên tập & rà soát" }] : []),
        ]}
      />
      {manager && !isManager ? (
        <Notice danger>
          Bạn không có quyền quản lý tài liệu. Chọn tài khoản Quản lý tài liệu
          hoặc trở về tra cứu.
        </Notice>
      ) : manager ? (
        <Panel
          title="Vòng đời tài liệu"
          description="Nhập → Che dữ liệu → Rà soát → Xuất bản → Cập nhật / Thu hồi"
        >
          <DataTable
            rows={s.documents}
            caption="Quản lý tài liệu"
            searchText={(d) => d.title + " " + d.id}
            columns={[
              {
                key: "title",
                label: "Tài liệu",
                sort: (d) => d.title,
                render: (d) => (
                  <>
                    <strong>{d.title}</strong>
                    <small>
                      {d.id} • {d.category}
                    </small>
                  </>
                ),
              },
              {
                key: "ver",
                label: "Phiên bản",
                sort: (d) => d.version,
                render: (d) => "v" + d.version,
              },
              {
                key: "status",
                label: "Trạng thái",
                render: (d) => (
                  <Badge
                    status={
                      d.status === "published" && d.expires < s.settings.date
                        ? "expired"
                        : d.status
                    }
                  />
                ),
              },
              {
                key: "pii",
                label: "Kiểm tra nội dung",
                render: (d) =>
                  documentHasPii(d) ? (
                    <span className="text-warning">Cần che thông tin</span>
                  ) : (
                    <span className="text-success">
                      Không còn dấu hiệu theo mẫu
                    </span>
                  ),
              },
              {
                key: "action",
                label: "Quản lý",
                render: (d) => (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => nav(base + "/" + d.id)}
                  >
                    Xem / xử lý
                  </Button>
                ),
              },
            ]}
          />
        </Panel>
      ) : (
        <>
          <div className="document-search">
            <div className="search-title">
              <span className="document-search-icon">
                <BookOpen size={25} />
              </span>
              <div>
                <h2>Bạn đang cần tìm thông tin gì?</h2>
                <p>Tra cứu nội dung đã rà soát, còn hiệu lực và đúng quyền.</p>
              </div>
            </div>
            <div className="document-search-controls">
              <div className="search-input">
                <Search size={20} />
                <input
                  aria-label={
                    online
                      ? "Tìm tài liệu bằng câu hỏi hoặc từ khóa"
                      : "Tìm tài liệu theo từ khóa"
                  }
                  maxLength={500}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ví dụ: định mức đồng phục, phân bổ tủ…"
                />
              </div>
              <select
                aria-label="Danh mục tìm tài liệu"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </div>
            <div className="search-suggestions">
              <span>Gợi ý:</span>
              {["định mức", "phê duyệt", "tủ đồ"].map((x) => (
                <button key={x} onClick={() => setQuery(x)}>
                  {x}
                </button>
              ))}
            </div>
          </div>
          <div className="section-label">
            <span>
              <strong>{results.length}</strong> tài liệu phù hợp
            </span>
            <span>
              <ShieldCheck size={15} />
              Đã lọc quyền trước truy xuất
            </span>
          </div>
          {online && query.trim() && (
            <p role="status" aria-live="polite">
              {searching
                ? "Đang tìm và đối chiếu nguồn…"
                : remoteSearch?.key === searchKey && remoteSearch.error
                  ? remoteSearch.error
                  : search?.retrievalMode === "hybrid"
                    ? "Truy xuất kết hợp từ khóa và ngữ nghĩa • Nguồn đã kiểm quyền"
                    : "Truy xuất từ khóa • Mô hình ngữ nghĩa chưa khả dụng"}
            </p>
          )}
          <div className="document-grid">
            {results.map(({ document: d, matches }) => (
              <article className="document-card" key={d.id}>
                <div className="document-card-top">
                  <span className="document-icon">
                    <FileText size={23} />
                  </span>
                  <Badge>{d.category}</Badge>
                </div>
                <h2>
                  <button
                    onClick={() => nav(sourceFor(d.id) || "/tai-lieu/" + d.id)}
                  >
                    {d.title}
                  </button>
                </h2>
                <p className="document-excerpt">
                  {(matches[0] || d.sections[0]).text.slice(0, 190)}…
                </p>
                <div className="document-info">
                  <span>
                    <CalendarDays size={13} />
                    {dateLabel(d.date)}
                  </span>
                  <span>Phiên bản {d.version}</span>
                </div>
                <div className="document-card-footer">
                  <small>{d.id}</small>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      nav(
                        sourceFor(d.id) ||
                          "/tai-lieu/" + d.id + "?version=" + d.version,
                      )
                    }
                  >
                    Đọc tài liệu
                    <ArrowUpRight size={15} />
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {!results.length && !searching && (
            <Panel>
              <Empty
                title="Không tìm thấy tài liệu phù hợp"
                description="Đổi từ khóa hoặc danh mục. Tài liệu ngoài quyền, chưa rà soát hoặc hết hiệu lực không được đưa vào tìm kiếm."
              />
            </Panel>
          )}
          <Notice>
            Hợp đồng và mọi nội dung tại đây đều hư cấu. Phiên bản và quyền được
            kiểm tra lại khi mở dẫn nguồn.
          </Notice>
        </>
      )}
      <Modal
        open={!!id}
        onOpenChange={(v) => !v && nav(base)}
        title={allowed && versionValid ? d!.title : "Tài liệu không khả dụng"}
        description={
          allowed && versionValid
            ? `${d!.id} • Phiên bản ${d!.version} • ${d!.owner}`
            : "Nguồn có thể đã thay phiên bản, thu hồi, hết hạn hoặc nằm ngoài quyền."
        }
        wide
      >
        {allowed && versionValid && d ? (
          <>
            <div className="detail-meta">
              <Badge
                status={
                  d.status === "published" && d.expires < s.settings.date
                    ? "expired"
                    : d.status
                }
              />
              <span>Ban hành: {dateLabel(d.date)}</span>
              <span>Hết hạn: {dateLabel(d.expires)}</span>
              <Badge>{d.category}</Badge>
            </div>
            {manager && d.status === "draft" && (
              <Notice danger>
                {documentHasPii(d)
                  ? "Phát hiện thông tin liên hệ tổng hợp cần che."
                  : "Bản nháp chưa lập chỉ mục. Rà soát và xác nhận xuất bản để tra cứu."}
              </Notice>
            )}
            <div className="document-reader">
              {d.sections.map((sec) => (
                <section id={sec.id} key={sec.id}>
                  <h3>{sec.title}</h3>
                  <p>
                    {online &&
                    !manager &&
                    (d as ReaderDocument).highlight?.sectionId === sec.id ? (
                      <>
                        {sec.text.slice(
                          0,
                          (d as ReaderDocument).highlight!.sourceStart,
                        )}
                        <mark>
                          {sec.text.slice(
                            (d as ReaderDocument).highlight!.sourceStart,
                            (d as ReaderDocument).highlight!.sourceEnd,
                          )}
                        </mark>
                        {sec.text.slice(
                          (d as ReaderDocument).highlight!.sourceEnd,
                        )}
                      </>
                    ) : (
                      sec.text
                    )}
                  </p>
                  {!manager && (
                    <div className="citation">
                      <Quote size={14} />
                      {d.title} • v{d.version} • {sec.title}
                    </div>
                  )}
                </section>
              ))}
            </div>
            {!manager && (
              <div className="actions wrap">
                <Button
                  variant="outline"
                  onClick={() =>
                    download(
                      d.id + "-demo.txt",
                      d.title +
                        "\nPhiên bản " +
                        d.version +
                        "\n\n" +
                        d.sections
                          .map((x) => x.title + "\n" + x.text)
                          .join("\n\n"),
                    )
                  }
                >
                  Tải văn bản demo
                </Button>
                {d.signRoles.includes(actor.role) &&
                  (d.signatures.some(
                    (x) => x.accountId === actor.id && x.version === d.version,
                  ) ? (
                    <Badge status="issued">
                      <CheckCheck size={15} />
                      Đã xác nhận phiên bản này
                    </Badge>
                  ) : (
                    <ConfirmAction
                      label="Xác nhận đã đọc"
                      variant="default"
                      description="Xác nhận bằng tài khoản demo, không phải chữ ký số có giá trị pháp lý."
                      onConfirm={() => act({ type: "document.sign", id: d.id })}
                    />
                  ))}
              </div>
            )}
            {manager && (
              <>
                <div className="actions wrap">
                  {!["revoked", "superseded"].includes(d.status) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditing(d);
                        nav(base);
                      }}
                    >
                      Sửa nội dung / quyền
                    </Button>
                  )}
                  {d.status === "draft" && (
                    <>
                      <ConfirmAction
                        label="Che thông tin cá nhân"
                        description="Che tên demo, số điện thoại và email theo quy tắc cục bộ; cần người rà soát tiếp."
                        onConfirm={() =>
                          act({ type: "document.mask", id: d.id })
                        }
                      />
                      <ConfirmAction
                        label="Xác nhận rà soát"
                        variant="default"
                        description="Xác nhận đã kiểm tra nội dung và hoàn tất che / loại thông tin theo mẫu."
                        onConfirm={() =>
                          act({ type: "document.review", id: d.id })
                        }
                      />
                    </>
                  )}
                  {d.status === "reviewed" && (
                    <ConfirmAction
                      label="Xuất bản và lập chỉ mục"
                      variant="default"
                      description="Chỉ văn bản đã xử lý được đưa vào tìm kiếm theo quyền đã chọn."
                      onConfirm={() =>
                        act({ type: "document.publish", id: d.id })
                      }
                    />
                  )}{" "}
                  {d.status === "published" && (
                    <>
                      <ConfirmAction
                        label="Tạo phiên bản mới"
                        description="Bản hiện hành được lưu lại và phục vụ tra cứu đến khi bản mới được xuất bản."
                        onConfirm={() =>
                          act({ type: "document.version", id: d.id })
                        }
                      />
                      <ConfirmAction
                        label="Thu hồi tài liệu"
                        variant="destructive"
                        description="Nội dung sẽ không còn trong kết quả tìm hoặc trợ lý; các dẫn nguồn phải kiểm tra lại."
                        onConfirm={() =>
                          act({ type: "document.revoke", id: d.id })
                        }
                      />
                    </>
                  )}
                </div>
                <Panel title="Lịch sử tài liệu">
                  <div className="panel-body">
                    {d.history.map((h, i) => (
                      <p key={i}>
                        v{h.version} • {dateLabel(h.date)} • {h.action}
                      </p>
                    ))}
                  </div>
                </Panel>
                {d.original && (
                  <details className="original-review">
                    <summary>Bản gốc tổng hợp dành cho người rà soát</summary>
                    <p>{d.original}</p>
                  </details>
                )}
              </>
            )}
          </>
        ) : online && !manager && remoteDocument?.key !== readerKey ? (
          <p role="status">Đang kiểm tra quyền và phiên bản nguồn…</p>
        ) : (
          <Notice danger>
            Không có quyền truy cập hoặc nguồn không còn hiệu lực. Nội dung
            không được truy xuất.
          </Notice>
        )}
      </Modal>
      {editing && (
        <DocumentForm
          document={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
