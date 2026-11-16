import { createSeed } from "../data/seed";
import type { State } from "../domain/types";
import { assertState, execute, type Command } from "../domain/commands";
import { migrateState } from "./migrations";
export const STORAGE_KEY = "vinmec-admin-demo:state:v1";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export class DemoStore {
  private state: State;
  private listeners = new Set<() => void>();
  private counter = 0;
  error = "";
  migrationNotice = "";
  constructor(private storage: StoragePort) {
    this.state = createSeed();
    try {
      const raw = storage.getItem(STORAGE_KEY);
      if (raw) {
        const { state: data, migrated } = migrateState(JSON.parse(raw));
        assertState(data);
        if (migrated) {
          storage.setItem(STORAGE_KEY, JSON.stringify(data));
          this.migrationNotice =
            "Đã nâng dữ liệu demo lên phiên bản 2, giữ nguyên hồ sơ và giá lịch sử. Giới tính nhân viên cũ chưa được suy đoán; mã hàng cũ dùng chung. Metadata ngân sách còn trống cần cập nhật khi phù hợp.";
        }
        this.state = data;
      } else storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      this.error =
        "Không thể đọc hoặc lưu dữ liệu demo. Dữ liệu hiện có được giữ nguyên. Tải bản JSON hoặc xác nhận khôi phục để tiếp tục.";
    }
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  private notify() {
    this.listeners.forEach((fn) => fn());
  }
  dispatch(
    actorId: string,
    command: Command,
    operationId?: string,
    expectedRevision = this.state.revision,
  ) {
    if (this.error) throw Error(this.error);
    if (expectedRevision !== this.state.revision)
      throw Error("Hồ sơ đã thay đổi. Tải lại trước khi xác nhận.");
    const op =
      operationId || `${command.type}-${this.state.sequence}-${++this.counter}`;
    const next = execute(this.state, actorId, command, op);
    if (next === this.state) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw Error(
        "Không lưu được localStorage. Chưa thay đổi dữ liệu; kiểm tra dung lượng rồi thử lại.",
      );
    }
    this.state = next;
    this.notify();
  }
  reset(actorId: string) {
    const next = createSeed();
    next.audits.unshift({
      id: "AUD-RESET",
      date: next.settings.date,
      actorId,
      module: "Hệ thống",
      entityId: "DEMO-RESET",
      action: "Khôi phục dữ liệu demo",
      detail: "Người dùng đã xác nhận xóa thay đổi và tạo lại seed",
    });
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw Error("Không lưu được bộ demo khôi phục. Dữ liệu chưa thay đổi.");
    }
    this.state = next;
    this.error = "";
    this.migrationNotice = "";
    this.notify();
  }
  externalChange() {
    this.error =
      "Dữ liệu đã đổi ở tab khác. Tải lại trang trước khi tiếp tục để tránh ghi đè.";
    this.notify();
  }
  exportRaw() {
    return this.storage.getItem(STORAGE_KEY) || JSON.stringify(this.state);
  }
}
