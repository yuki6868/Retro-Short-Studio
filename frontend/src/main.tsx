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
        characterAssignment={pixelEditorParams.characterAssignment}
        onSaveDocument={(input) => savePixelDocumentToProject(pixelEditorParams, input)}
      />
    );
  }

  return <StudioApp />;
}

function readPixelEditorParams(): { projectId: string; projectName: string; characterAssignment?: { characterId: string; kind: "expression" | "eye" | "mouth" | "motion"; state: string } } | null {
  if (!window.location.hash.startsWith("#pixel-editor")) {
    return null;
  }

  const query = window.location.hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const characterId = params.get("characterId");
  const kind = params.get("characterImageKind");
  const state = params.get("characterImageState");
  const characterAssignment = characterId !== null && isCharacterImageMapKind(kind) && state !== null
    ? { characterId, kind, state }
    : undefined;

  return {
    projectId: params.get("projectId") ?? "project-local-preview",
    projectName: params.get("projectName") ?? "Local Preview",
    ...(characterAssignment === undefined ? {} : { characterAssignment }),
  };
}

function isCharacterImageMapKind(value: string | null): value is "expression" | "eye" | "mouth" | "motion" {
  return value === "expression" || value === "eye" || value === "mouth" || value === "motion";
}
