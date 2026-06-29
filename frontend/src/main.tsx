import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { StudioApp } from "./react";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Retro Short Studio root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
);
