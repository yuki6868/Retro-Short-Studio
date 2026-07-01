import type { ReactElement } from "react";

import { useStudioAppController } from "./StudioAppController";
import { StudioWorkspace } from "./StudioWorkspace";
import "./studio-app.css";

export function StudioApp(): ReactElement {
  const workspaceProps = useStudioAppController();

  return <StudioWorkspace {...workspaceProps} />;
}
