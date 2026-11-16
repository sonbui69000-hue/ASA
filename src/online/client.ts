import type { Command } from "../domain/commands";
import type { StateRef, StateView } from "../domain/types";
import type { AssistantReply } from "./protocol";
export class ClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  route: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(route, {
      ...options,
      credentials: "same-origin",
      headers: { ...options.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ClientError(
      "NETWORK",
      "Không kết nối được máy chủ. Không có thay đổi cục bộ nào được ghi.",
      503,
    );
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok)
    throw new ClientError(
      payload?.error?.code || "NETWORK",
      payload?.error?.message || "Dịch vụ chưa khả dụng.",
      response.status,
    );
  return payload as T;
}
export class RemoteStore {
  readonly online = true;
  error = "";
  migrationNotice = "";
  private listeners = new Set<() => void>();
  private state: StateView;
  private timer: ReturnType<typeof setInterval> | null = null;
  private stopped = false;
  private pending = new Map<string, { id: string; ref: StateRef }>();
  constructor(
    initial: StateView,
    readonly csrf: string,
    readonly principalId: string,
    readonly requestSwitch: (id: string) => void,
    private onExpired: () => void,
  ) {
    this.state = initial;
    this.cache();
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private notify() {
    this.listeners.forEach((fn) => fn());
  }
  private cache() {
    try {
      for (const key of Object.keys(localStorage))
        if (key.startsWith("asa-online-cache:")) localStorage.removeItem(key);
      localStorage.setItem(
        `asa-online-cache:v1:${this.state.readModel.ref.workspaceId}:${this.principalId}`,
        JSON.stringify({
          ref: this.state.readModel.ref,
          stocks: this.state.readModel.stocks,
        }),
      );
    } catch {
      /* Cache never controls a server commit. */
    }
  }
  private accept(next: StateView) {
    if (this.stopped) return;
    if (next.readModel?.principalId !== this.principalId)
      throw new ClientError("SESSION_CHANGED", "Phiên đã thay đổi.", 401);
    this.state = next;
    this.error = "";
    this.cache();
    this.notify();
  }
  async refresh() {
    try {
      this.accept(await api<StateView>("/api/views/application"));
    } catch (error) {
      if (this.stopped) return;
      if (error instanceof ClientError && error.status === 401) {
        this.onExpired();
        return;
      }
      this.error =
        "Mất kết nối máy chủ. Dữ liệu chưa được đối chiếu; thao tác ghi đã tạm dừng.";
      this.state = { ...this.state };
      this.notify();
      throw error;
    }
  }
  start() {
    this.stopped = false;
    this.cache();
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.poll();
    }, 2000);
    window.addEventListener("focus", this.focus);
  }
  private focus = () => {
    void this.refresh().catch(() => {});
  };
  private async poll() {
    if (this.stopped) return;
    try {
      const ref = await api<StateRef & { principalId: string }>(
        "/api/state/ref",
      );
      if (this.stopped) return;
      if (ref.principalId !== this.principalId) {
        this.onExpired();
        return;
      }
      if (
        this.error ||
        ref.workspaceId !== this.state.readModel.ref.workspaceId ||
        ref.revision !== this.state.revision
      )
        await this.refresh();
    } catch (error) {
      if (this.stopped) return;
      if (error instanceof ClientError && error.status === 401) {
        this.onExpired();
        return;
      }
      if (!this.stopped) {
        this.error =
          "Mất kết nối máy chủ. Không thể xác nhận dữ liệu hiện tại.";
        this.state = { ...this.state };
        this.notify();
      }
    }
  }
  stop() {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    window.removeEventListener("focus", this.focus);
    try {
      for (const key of Object.keys(localStorage))
        if (key.startsWith("asa-online-cache:")) localStorage.removeItem(key);
    } catch {}
  }
  async dispatch(actorId: string, command: Command) {
    if (this.stopped || actorId !== this.principalId)
      throw Error("Phiên tài khoản đã thay đổi.");
    if (this.error) throw Error(this.error);
    const key = JSON.stringify(command),
      op = this.pending.get(key) || {
        id: crypto.randomUUID(),
        ref: this.state.readModel.ref,
      };
    this.pending.set(key, op);
    try {
      const next = await api<StateView>("/api/commands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": this.csrf,
        },
        body: JSON.stringify({
          command,
          operationId: op.id,
          expectedStateRef: op.ref,
        }),
      });
      this.pending.delete(key);
      this.accept(next);
    } catch (error) {
      if (error instanceof ClientError && error.status < 500) {
        this.pending.delete(key);
        if (error.code === "STALE") await this.refresh();
        if (error.status === 401) this.onExpired();
      }
      throw error;
    }
  }
  async reset(_actorId: string) {
    const next = await api<StateView>("/api/demo/reset", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrf,
      },
      body: JSON.stringify({
        confirmed: true,
        expectedStateRef: this.state.readModel.ref,
      }),
    });
    this.accept(next);
  }
  async exportRaw() {
    const view = await api<StateView>("/api/views/application");
    return JSON.stringify(
      { kind: "authorized-read-view", ref: view.readModel.ref, view },
      null,
      2,
    );
  }
  async clearConversation() {
    await api("/api/assistant/conversation", {
      method: "DELETE",
      headers: { "X-CSRF-Token": this.csrf },
    });
  }
  async query(
    question: string,
    routeRecordId: string | undefined,
    signal: AbortSignal,
    conversation: {
      requestId?: string;
      replyTo?: string;
      resetContext?: boolean;
    } = {},
  ): Promise<AssistantReply> {
    if (this.stopped) throw Error("Phiên đã kết thúc.");
    return api("/api/assistant/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrf,
      },
      body: JSON.stringify({
        question,
        routeRecordId,
        ...conversation,
        requestId: conversation.requestId || crypto.randomUUID(),
        expectedStateRef: this.state.readModel.ref,
      }),
      signal,
    });
  }
}
