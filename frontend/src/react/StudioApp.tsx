import { useState, type ReactElement } from "react";

import { useStudioAppController } from "./StudioAppController";
import { StudioWorkspace } from "./StudioWorkspace";
import "./studio-app.css";

export function StudioApp(): ReactElement {
  const [workspaceVersion, setWorkspaceVersion] = useState(0);

  return <StudioAppInstance key={workspaceVersion} onRequestWorkspaceReload={() => setWorkspaceVersion((version) => version + 1)} />;
}

type StudioAppInstanceProps = {
  onRequestWorkspaceReload(): void;
};

function StudioAppInstance({ onRequestWorkspaceReload }: StudioAppInstanceProps): ReactElement {
  const workspaceProps = useStudioAppController({ onRequestWorkspaceReload });

  return <StudioWorkspace {...workspaceProps} />;
}
