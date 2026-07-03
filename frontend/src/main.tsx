import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { PixelEditorWindow, savePixelDocumentToProject } from "./pixel";
import { StudioApp } from "./react";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Retro Short Studio root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <RootApp />
  </StrictMode>,
);

function RootApp() {
  const pixelEditorParams = readPixelEditorParams();

  if (pixelEditorParams !== null) {
    return (
      <PixelEditorWindow
        projectId={pixelEditorParams.projectId}
        projectName={pixelEditorParams.projectName}
        onSaveDocument={(input) => savePixelDocumentToProject(pixelEditorParams, input)}
      />
    );
  }

  return <StudioApp />;
}

function readPixelEditorParams(): { projectId: string; projectName: string } | null {
  if (!window.location.hash.startsWith("#pixel-editor")) {
    return null;
  }

  const query = window.location.hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  return {
    projectId: params.get("projectId") ?? "project-local-preview",
    projectName: params.get("projectName") ?? "Local Preview",
  };
}
