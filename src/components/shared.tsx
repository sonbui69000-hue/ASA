import {
  useEffect,
  useId,
  useRef,
  useState,
  isValidElement,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type FormEvent,
} from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  X,
  Inbox,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./ui/button";
import { statuses } from "../domain/types";
export { Button };
export function Badge({
  status,
  children,
}: {
  status?: string;
  children?: ReactNode;
}) {
  return (
    <span className={`badge badge-${status || "info"}`}>
      {children || statuses[status || ""] || status}
    </span>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}
export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  title = "Chưa có dữ liệu phù hợp",
  description = "Điều chỉnh bộ lọc hoặc tạo hồ sơ mới để tiếp tục.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Notice({
  children,
  danger = false,
}: {
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className={`notice ${danger ? "notice-danger" : ""}`}
      role={danger ? "alert" : "note"}
    >
      <AlertCircle size={18} />
      <div>{children}</div>
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const [error, setError] = useState("");
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{
          id?: string;
          "aria-describedby"?: string;
          "aria-invalid"?: boolean;
        }>,
        {
          id,
          "aria-describedby":
            [hint ? id + "-hint" : "", error ? id + "-error" : ""]
              .filter(Boolean)
              .join(" ") || undefined,
          "aria-invalid": !!error,
        },
      )
    : children;
  return (
    <div
      className="field"
      onInputCapture={() => setError("")}
      onInvalidCapture={(event) => {
        event.preventDefault();
        const el = event.target as HTMLInputElement;
        setError(
          el.validity.valueMissing
            ? "Vui lòng nhập hoặc chọn " + label.toLowerCase() + "."
            : el.validity.rangeUnderflow
              ? "Giá trị tối thiểu là " + el.min + "."
              : el.validity.rangeOverflow
                ? "Giá trị tối đa là " + el.max + "."
                : "Nhập giá trị đúng định dạng cho " +
                  label.toLowerCase() +
                  ".",
        );
        if (el.form?.querySelector(":invalid") === el) el.focus();
      }}
    >
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && <small id={id + "-hint"}>{hint}</small>}
      {error && (
        <small id={id + "-error"} className="field-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="tabs" role="tablist" aria-label="Nhóm nội dung">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
        >
          {t.label}
          {t.count !== undefined && <span>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSubmit,
  submitLabel = "Lưu thay đổi",
  wide = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  onSubmit?: () => void | Promise<void>;
  submitLabel?: string;
  wide?: boolean;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  if (open && !wasOpen.current)
    trigger.current = document.activeElement as HTMLElement | null;
  wasOpen.current = open;
  const errorId = useId();
  const descriptionId = useId();
  useEffect(() => {
    setError("");
    setBusy(false);
  }, [open]);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!onSubmit) return;
    setError("");
    setBusy(true);
    try {
      await onSubmit?.();
      onOpenChange(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không thể thực hiện thao tác.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (trigger.current?.isConnected) trigger.current.focus();
          }}
          className={`modal ${wide ? "modal-wide" : ""}`}
          aria-describedby={description ? descriptionId : undefined}
        >
          <div className="modal-heading">
            <div>
              <Dialog.Title>{title}</Dialog.Title>
              {description && (
                <Dialog.Description id={descriptionId}>
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Đóng hộp thoại">
                <X size={20} />
              </Button>
            </Dialog.Close>
          </div>
          <form onSubmit={submit}>
            <div className="modal-body">
              {error && (
                <div
                  ref={ref}
                  tabIndex={-1}
                  role="alert"
                  id={errorId}
                  className="form-error"
                >
                  <AlertCircle size={18} />
                  {error}
                </div>
              )}
              {children}
            </div>
            <div className="modal-footer">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {onSubmit ? "Hủy" : "Đóng"}
              </Button>
              {onSubmit && (
                <Button type="submit" disabled={busy}>
                  {busy ? "Đang xử lý…" : submitLabel}
                </Button>
              )}
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function ConfirmAction({
  label,
  title,
  description,
  onConfirm,
  reason = false,
  variant = "outline",
  disabled = false,
}: {
  label: string;
  title?: string;
  description: string;
  onConfirm: (reason: string) => void | Promise<void>;
  reason?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [text, setText] = useState("");
  return (
    <>
      <Button
        variant={variant}
        size="sm"
        disabled={disabled}
        onClick={() => {
          setText("");
          setOpen(true);
        }}
      >
        {label}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={title || label}
        description={description}
        submitLabel="Xác nhận"
        onSubmit={() => onConfirm(text)}
      >
        {reason ? (
          <Field label="Lý do / ghi chú">
            <textarea
              required
              minLength={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập ít nhất 5 ký tự"
            />
          </Field>
        ) : (
          <Notice>
            Vui lòng kiểm tra thông tin. Chỉ khi xác nhận, hệ thống mới ghi nhận
            thao tác và nhật ký demo.
          </Notice>
        )}
      </Modal>
    </>
  );
}
export interface Column<T> {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
}
export function DataTable<T>({
  rows,
  columns,
  caption,
  searchText,
  pageSize = 8,
}: {
  rows: T[];
  columns: Column<T>[];
  caption: string;
  searchText?: (row: T) => string;
  pageSize?: number;
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [sort, setSort] = useState(""),
    [asc, setAsc] = useState(true);
  useEffect(() => setPage(0), [query, rows.length]);
  const normalize = (t: string) =>
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d");
  const filtered = rows.filter(
    (r) => !searchText || normalize(searchText(r)).includes(normalize(query)),
  );
  const col = columns.find((c) => c.key === sort);
  const sorted = col?.sort
    ? [...filtered].sort(
        (a, b) =>
          String(col.sort!(a)).localeCompare(String(col.sort!(b)), "vi", {
            numeric: true,
          }) * (asc ? 1 : -1),
      )
    : filtered;
  const maxPage = Math.max(0, Math.ceil(sorted.length / pageSize) - 1),
    current = Math.min(page, maxPage);
  return (
    <div>
      {searchText && (
        <div className="table-search">
          <Search size={17} />
          <input
            aria-label={`Tìm trong ${caption}`}
            value={query}
            placeholder="Tìm theo tên, mã hoặc nội dung…"
            onChange={(e) => setQuery(e.target.value)}
          />
          <span>{filtered.length} kết quả</span>
        </div>
      )}
      {sorted.length ? (
        <>
          <div
            className="table-scroll"
            role="region"
            aria-label={caption}
            tabIndex={0}
          >
            <table>
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      aria-sort={
                        sort === c.key
                          ? asc
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                    >
                      {c.sort ? (
                        <button
                          onClick={() => {
                            setSort(c.key);
                            setAsc(sort === c.key ? !asc : true);
                          }}
                        >
                          {c.label}
                          <ArrowDownUp size={13} />
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted
                  .slice(current * pageSize, (current + 1) * pageSize)
                  .map((r, i) => (
                    <tr key={String((r as { id?: string }).id || i)}>
                      {columns.map((c) => (
                        <td key={c.key}>{c.render(r)}</td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              Hiển thị {current * pageSize + 1}–
              {Math.min((current + 1) * pageSize, sorted.length)} /{" "}
              {sorted.length} bản ghi
            </span>
            <div>
              <Button
                variant="outline"
                size="icon"
                aria-label="Trang trước"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
                <ChevronLeft size={16} />
              </Button>
              <span>
                {current + 1} / {maxPage + 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Trang sau"
                disabled={current >= maxPage}
                onClick={() => setPage(current + 1)}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <Empty />
      )}
    </div>
  );
}
export function download(
  name: string,
  text: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportCsv(
  name: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const safe = (v: string | number) =>
    '"' +
    String(v)
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  download(
    name,
    "\uFEFF" +
      [headers, ...rows].map((r) => r.map(safe).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
export function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Download size={16} />
      Xuất CSV
    </Button>
  );
}
export function SuccessToast({
  text,
  danger,
  onClose,
}: {
  text: string;
  danger: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`toast ${danger ? "toast-danger" : ""}`}
      role={danger ? "alert" : "status"}
    >
      {danger ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
      <span>{text}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        aria-label="Đóng thông báo"
      >
        <X size={18} />
      </Button>
    </div>
  );
}
