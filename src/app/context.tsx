import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { DemoStore } from "../store/store";
import { RemoteStore } from "../online/client";
import type { ReadState } from "../domain/types";
type ApplicationStore = DemoStore | RemoteStore;
import { account } from "../domain/selectors";
import type { Command } from "../domain/commands";
import { SuccessToast } from "../components/shared";
const Context = createContext<ReturnType<typeof useProvider> | null>(null);
function useProvider(store: ApplicationStore) {
  const state = useSyncExternalStore<ReadState>(
    store.subscribe,
    store.getSnapshot,
  );
  const [actorId, setActorId] = useState(() =>
    store instanceof RemoteStore
      ? store.principalId
      : localStorage.getItem("asa-demo-account") || "hc",
  );
  const activeAccounts = state.accounts.filter((a) =>
    state.employees.some((e) => e.id === a.employeeId && e.active),
  );
  const actor = account(
    state,
    activeAccounts.find((a) => a.id === actorId)?.id ||
      activeAccounts.find((a) => a.id === "hc")?.id ||
      activeAccounts[0]?.id ||
      "hc",
  );
  const [toast, setToast] = useState<{ text: string; danger: boolean } | null>(
    null,
  );
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function notify(text: string, danger = false) {
    setToast({ text, danger });
  }
  function act(command: Command) {
    const result = store.dispatch(actor.id, command);
    if (result instanceof Promise)
      return result.then(() => {
        notify("Đã lưu thay đổi vào dữ liệu demo trên máy chủ.");
      });
    notify("Đã lưu thay đổi vào dữ liệu demo.");
  }
  function switchActor(id: string) {
    if (store instanceof RemoteStore) {
      store.requestSwitch(id);
      return;
    }
    setActorId(id);
    try {
      localStorage.setItem("asa-demo-account", id);
    } catch {
      /* Dữ liệu nghiệp vụ vẫn do store xác nhận. */
    }
    setToast(null);
  }
  return { state, actor, store, act, notify, switchActor, toast, setToast };
}
export function DemoProvider({
  store,
  children,
}: {
  store: ApplicationStore;
  children: ReactNode;
}) {
  const value = useProvider(store);
  return (
    <Context.Provider value={value}>
      {children}
      {value.toast && (
        <SuccessToast {...value.toast} onClose={() => value.setToast(null)} />
      )}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw Error("Thiếu DemoProvider");
  return value;
}
