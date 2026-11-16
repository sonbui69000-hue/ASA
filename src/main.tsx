import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import { DemoProvider } from "./app/context";
import { DemoStore, STORAGE_KEY } from "./store/store";
import "./styles.css";
const store = new DemoStore(localStorage);
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) store.externalChange();
});
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <DemoProvider store={store}>
        <App />
      </DemoProvider>
    </BrowserRouter>
  </StrictMode>,
);
