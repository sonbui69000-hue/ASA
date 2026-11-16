import { useEffect, useState } from "react";
import { App } from "../app/App";
import { DemoProvider } from "../app/context";
import { Button, Field, Notice } from "../components/shared";
import type { Account, StateView } from "../domain/types";
import { api, ClientError, RemoteStore } from "./client";
interface SessionReply {
  csrf: string;
  actor: Account;
  view: StateView;
}
export function OnlineApp() {
  const [accounts, setAccounts] = useState<
      Pick<Account, "id" | "name" | "role">[]
    >([]),
    [selected, setSelected] = useState("hc"),
    [credential, setCredential] = useState(""),
    [store, setStore] = useState<RemoteStore | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  function expired() {
    setStore((old) => {
      old?.stop();
      return null;
    });
    setError("Phiên đã kết thúc. Vui lòng đăng nhập lại.");
  }
  function connect(reply: SessionReply) {
    const connection = new RemoteStore(
      reply.view,
      reply.csrf,
      reply.actor.id,
      (id) => {
        connection.stop();
        void api("/api/session", {
          method: "DELETE",
          headers: { "X-CSRF-Token": reply.csrf },
        })
          .catch(() => {})
          .finally(() => {
            setStore(null);
            setSelected(id);
            setCredential("");
          });
      },
      expired,
    );
    setStore(connection);
    setError("");
  }
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    Promise.all([
      api<{ accounts: typeof accounts }>("/api/accounts"),
      api<SessionReply>("/api/session").catch((e) => {
        if (e instanceof ClientError && e.status === 401) return null;
        throw e;
      }),
    ])
      .then(([list, session]) => {
        if (disposed) return;
        setAccounts(list.accounts);
        if (session) connect(session);
      })
      .catch(() => {
        if (!disposed)
          setError(
            "Không kết nối được máy chủ. Chạy npm run server và kiểm tra tài khoản đã được cấp.",
          );
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [attempt]);
  useEffect(() => {
    store?.start();
    return () => {
      store?.stop();
    };
  }, [store]);
  if (store)
    return (
      <DemoProvider store={store}>
        <App />
      </DemoProvider>
    );
  return (
    <main className="online-login">
      <section className="panel">
        <div className="panel-body">
          <h1>Đăng nhập bản mẫu online</h1>
          <p>
            Workspace cục bộ • SAP mô phỏng • Phiên được kiểm tra trên máy chủ
          </p>
          {error && <Notice danger>{error}</Notice>}
          {loading ? (
            <p role="status">Đang kết nối máy chủ…</p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  const reply = await api<SessionReply>("/api/session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accountId: selected, credential }),
                  });
                  setCredential("");
                  connect(reply);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Không đăng nhập được.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Tài khoản máy chủ">
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option value={a.id} key={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Mã truy cập demo">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={200}
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                />
              </Field>
              <p>
                Mã riêng từng tài khoản do người vận hành cấp bằng lệnh{" "}
                <code>npm run provision:accounts</code>. Chọn tài khoản không tự
                cấp quyền.
              </p>
              <Button type="submit" disabled={busy || !accounts.length}>
                {busy ? "Đang đăng nhập…" : "Đăng nhập"}
              </Button>
              {!accounts.length && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAttempt((n) => n + 1)}
                >
                  Thử kết nối lại
                </Button>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
