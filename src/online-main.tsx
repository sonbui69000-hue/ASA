import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { OnlineApp } from "./online/OnlineApp";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <OnlineApp />
    </BrowserRouter>
  </StrictMode>,
);
