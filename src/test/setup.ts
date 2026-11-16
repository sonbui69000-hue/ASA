import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
afterEach(() => {
  cleanup();
  if (typeof localStorage !== "undefined") localStorage.clear();
  if (typeof sessionStorage !== "undefined") sessionStorage.clear();
});
if (typeof window !== "undefined" && !window.matchMedia)
  window.matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    media: "",
    onchange: null,
  });
